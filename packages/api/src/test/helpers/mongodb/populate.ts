import { CollabTextSchema } from '../../../mongodb/schema/collabText/collab-text';
import { NoteSchema, noteDefaultValues } from '../../../mongodb/schema/note';
import { UserSchema } from '../../../mongodb/schema/user';
import { faker } from '@faker-js/faker';
import { Changeset } from '~collab/changeset/changeset';
import { mongoCollections } from '../mongodb';
import { CollectionName } from '../../../mongodb/collections';
import { ObjectId } from 'mongodb';
import { UserNoteSchema } from '../../../mongodb/schema/user-note';

type Task = () => Promise<void>;

let populateQueue: Task[] = [];

function queuePopulate(task: Task) {
  populateQueue.push(task);
}

export function populateWithCreatedData() {
  try {
    return Promise.all(populateQueue.map((task) => task()));
  } finally {
    populateQueue = [];
  }
}

export function fakeUserData(): UserSchema {
  return {
    _id: new ObjectId(),
    profile: {
      displayName: faker.person.fullName(),
    },
    thirdParty: {
      google: {
        id: faker.string.numeric({ length: 20 }),
      },
    },
    notes: {
      category: {
        default: {
          order: [],
        },
        sticky: {
          order: [],
        },
        archived: {
          order: [],
        },
      },
    },
  };
}

export function createUser() {
  const user = fakeUserData();
  queuePopulate(async () => {
    await mongoCollections[CollectionName.Users].insertOne(user);
  });
  return user;
}

export function createUserMany(count: number) {
  const users = [...new Array<undefined>(count)].map(() => fakeUserData());
  queuePopulate(async () => {
    await mongoCollections[CollectionName.Users].insertMany(users);
  });
  return users;
}

export function fakeUserNoteData(user: UserSchema, note: NoteSchema): UserNoteSchema {
  return {
    _id: new ObjectId(),
    userId: user._id,
    note: {
      id: note._id,
      publicId: note.publicId,
      collabTextIds: note.collabTextIds,
    },
    readOnly: !!faker.number.int({ max: 1 }),
    preferences: {
      backgroundColor: faker.color.rgb(),
    },
  };
}

export function createUserNote(user: UserSchema, note: NoteSchema) {
  const userNote = fakeUserNoteData(user, note);
  queuePopulate(async () => {
    await mongoCollections[CollectionName.UserNotes].insertOne(userNote);
  });
  return userNote;
}

export function createUserNoteMany(user: UserSchema, notes: NoteSchema[]) {
  const userNotes = notes.map((note) => fakeUserNoteData(user, note));
  queuePopulate(async () => {
    await mongoCollections[CollectionName.UserNotes].insertMany(userNotes);
  });
  return userNotes;
}

interface FakeNoteDataOptions {
  publicId?: string;
}

export function fakeNoteData(
  user: UserSchema,
  collabTexts: Record<string, CollabTextSchema>,
  options?: FakeNoteDataOptions
): NoteSchema {
  return {
    _id: new ObjectId(),
    ownerId: user._id,
    publicId: options?.publicId ?? noteDefaultValues.publicId(),
    collabTextIds: Object.fromEntries(
      Object.entries(collabTexts).map(([collabTextKey, { _id }]) => [collabTextKey, _id])
    ),
  };
}

export function createNote(
  user: UserSchema,
  collabTexts: Record<string, CollabTextSchema>,
  options?: FakeNoteDataOptions
) {
  const note = fakeNoteData(user, collabTexts, options);
  queuePopulate(async () => {
    await mongoCollections[CollectionName.Notes].insertOne(note);
  });
  return note;
}

interface CreateNoteManyOptions {
  /**
   * Create note publicId with a ordered numerical value.
   * Can specify starting number.
   */
  enumaratePublicIdByIndex?: number;
}

export function createNoteMany(
  user: UserSchema,
  textFieldsList: Record<string, CollabTextSchema>[],
  options?: CreateNoteManyOptions
) {
  const notes = textFieldsList.map((collabTexts, index) =>
    fakeNoteData(user, collabTexts, {
      publicId:
        options?.enumaratePublicIdByIndex != null
          ? `publicId_${options.enumaratePublicIdByIndex + index}`
          : undefined,
    })
  );
  queuePopulate(async () => {
    await mongoCollections[CollectionName.Notes].insertMany(notes);
  });
  return notes;
}

export function fakeCollabTextRecordData(
  user: UserSchema,
  revision: number
): CollabTextSchema['records'][0] {
  return {
    creatorUserId: user._id,
    userGeneratedId: faker.string.uuid(),
    revision,
    changeset: Changeset.fromInsertion(`r_${revision}`).serialize(),
    beforeSelection: {
      start: 0,
    },
    afterSelection: {
      start: 0,
    },
  };
}

interface FakeCollabTextDataOptions {
  tailRevision?: number;
  recordsCount?: number;
}

export function fakeCollabTextData(
  user: UserSchema,
  options?: FakeCollabTextDataOptions
): CollabTextSchema {
  const tailRevision = options?.tailRevision ?? faker.number.int({ max: 1000 });
  const recordsCount = options?.recordsCount ?? faker.number.int({ min: 1, max: 10 });
  const headRevision = tailRevision + recordsCount;

  return {
    _id: new ObjectId(),
    headText: {
      revision: headRevision,
      changeset: Changeset.fromInsertion('head').serialize(),
    },
    tailText: {
      revision: tailRevision,
      changeset: Changeset.EMPTY.serialize(),
    },
    records: [...new Array<undefined>(recordsCount)].map((_, i) =>
      fakeCollabTextRecordData(user, tailRevision + i + 1)
    ),
  };
}

export function createCollabText(
  user: UserSchema,
  collabDocOptions?: FakeCollabTextDataOptions
) {
  const collabText = fakeCollabTextData(user, collabDocOptions);
  queuePopulate(async () => {
    await mongoCollections[CollectionName.CollabTexts].insertOne(collabText);
  });
  return collabText;
}

export function createCollabTextMany(
  user: UserSchema,
  count: number,
  collabDocOptions?: FakeCollabTextDataOptions
) {
  const collabTexts = [...new Array<undefined>(count)].map(() =>
    fakeCollabTextData(user, collabDocOptions)
  );
  queuePopulate(async () => {
    await mongoCollections[CollectionName.CollabTexts].insertMany(collabTexts);
  });
  return collabTexts;
}

interface CreateUserWithNotesOptions {
  noteMany?: CreateNoteManyOptions;
  collabDoc?: FakeCollabTextDataOptions;
}

export function createUserWithNotes(
  notesCount: number,
  collabTextKeys: string[],
  options?: CreateUserWithNotesOptions
) {
  const user = createUser();
  const collabTexts = createCollabTextMany(
    user,
    notesCount * collabTextKeys.length,
    options?.collabDoc
  );
  const notes = createNoteMany(
    user,
    [...new Array<undefined>(notesCount)].map((_, i) =>
      Object.fromEntries(
        collabTextKeys.map((field, j) => [
          field,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          collabTexts[i * collabTextKeys.length + j]!,
        ])
      )
    ),
    options?.noteMany
  );

  const userNotes = createUserNoteMany(user, notes);

  user.notes.category.default.order = userNotes.map(({ _id }) => _id);

  return {
    user,
    collabTexts,
    notes,
    userNotes,
  };
}
