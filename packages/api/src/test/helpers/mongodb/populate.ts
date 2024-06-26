import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { assert } from 'vitest';
import { Changeset, SerializedChangeset } from '~collab/changeset/changeset';

import { CollectionName } from '../../../mongodb/collections';
import {
  CollabTextSchema,
  RevisionRecordSchema,
} from '../../../mongodb/schema/collab-text';
import { NoteSchema, noteDefaultValues } from '../../../mongodb/schema/note';
import {
  ShareNoteLinkSchema,
  shareNoteLinkDefaultValues,
} from '../../../mongodb/schema/share-note-link';
import { UserSchema } from '../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../mongodb/schema/user-note';
import { mongoCollections } from '../mongodb';



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

interface FakeUserNoteDataOptions {
  readOnly?: boolean;
}

export function fakeUserNoteData(
  user: UserSchema,
  note: NoteSchema,
  options?: FakeUserNoteDataOptions
): UserNoteSchema {
  return {
    _id: new ObjectId(),
    userId: user._id,
    note: {
      id: note._id,
      publicId: note.publicId,
      collabTextIds: note.collabTextIds,
    },
    readOnly: options?.readOnly ?? !!faker.number.int({ max: 1 }),
    preferences: {
      backgroundColor: faker.color.rgb(),
    },
  };
}

export function createUserNote(
  user: UserSchema,
  note: NoteSchema,
  options?: FakeUserNoteDataOptions
) {
  const userNote = fakeUserNoteData(user, note, options);
  queuePopulate(async () => {
    await mongoCollections[CollectionName.UserNotes].insertOne(userNote);
  });
  return userNote;
}

export function createUserNoteMany(
  user: UserSchema,
  notes: NoteSchema[],
  options?: FakeUserNoteDataOptions
) {
  const userNotes = notes.map((note) => fakeUserNoteData(user, note, options));
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
  collabTextsList: Record<string, CollabTextSchema>[],
  options?: CreateNoteManyOptions
) {
  const notes = collabTextsList.map((collabTexts, index) =>
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

interface FakeCollabTextRecordDataOptions {
  revision?: number;
  changeset?: SerializedChangeset;
  userGeneratedId?: string;
}

export function fakeCollabTextRecordData(
  user: UserSchema,
  options?: FakeCollabTextRecordDataOptions
): CollabTextSchema['records'][0] {
  const revision = options?.revision ?? faker.number.int({ max: 1000 });
  return {
    creatorUserId: user._id,
    userGeneratedId: options?.userGeneratedId ?? faker.string.nanoid(6),
    revision,
    changeset: options?.changeset ?? Changeset.fromInsertion(`r_${revision}`).serialize(),
    beforeSelection: {
      start: 0,
    },
    afterSelection: {
      start: 0,
    },
  };
}

type FakeCollabTextDataOptions =
  | {
      tailRevision?: number;
      recordsCount?: number;
    }
  | {
      records: [
        Required<FakeCollabTextRecordDataOptions>,
        ...Required<FakeCollabTextRecordDataOptions>[],
      ];
    };

export function fakeCollabTextData(
  user: UserSchema,
  options?: FakeCollabTextDataOptions
): CollabTextSchema {
  if (options && 'records' in options) {
    const records = options.records.map((recordOptions) =>
      fakeCollabTextRecordData(user, recordOptions)
    );

    const lastRecord = records[records.length - 1];
    assert(lastRecord != null);
    const headText = options.records.reduce(
      (a, b) => a.compose(Changeset.parseValue(b.changeset)),
      Changeset.EMPTY
    );

    return {
      _id: new ObjectId(),
      headText: {
        revision: lastRecord.revision,
        changeset: headText.serialize(),
      },
      tailText: {
        revision: 0,
        changeset: Changeset.EMPTY.serialize(),
      },
      records,
    };
  }

  const tailRevision = options?.tailRevision ?? faker.number.int({ max: 1000 });
  const recordsCount = options?.recordsCount ?? faker.number.int({ min: 1, max: 10 });
  const headRevision = tailRevision + recordsCount;

  const headText = Changeset.fromInsertion('head');

  const records: RevisionRecordSchema[] = [];
  if (recordsCount > 1) {
    records.push(
      ...[...new Array<undefined>(recordsCount - 1)].map((_, i) =>
        fakeCollabTextRecordData(user, {
          revision: tailRevision + i + 1,
        })
      )
    );
  }

  if (recordsCount > 0) {
    records.push(
      fakeCollabTextRecordData(user, {
        revision: tailRevision + recordsCount,
        changeset: headText.serialize(),
      })
    );
  }

  return {
    _id: new ObjectId(),
    headText: {
      revision: headRevision,
      changeset: headText.serialize(),
    },
    tailText: {
      revision: tailRevision,
      changeset: Changeset.EMPTY.serialize(),
    },
    records,
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
  collabTextOptions?: FakeCollabTextDataOptions
) {
  const collabTexts = [...new Array<undefined>(count)].map(() =>
    fakeCollabTextData(user, collabTextOptions)
  );
  queuePopulate(async () => {
    await mongoCollections[CollectionName.CollabTexts].insertMany(collabTexts);
  });
  return collabTexts;
}

interface FakeShareNoteLinkDataOptions {
  publicId?: string;
}

export function fakeShareNoteLinkData(
  userNote: UserNoteSchema,
  options?: FakeShareNoteLinkDataOptions
): ShareNoteLinkSchema {
  return {
    _id: new ObjectId(),
    publicId: options?.publicId ?? shareNoteLinkDefaultValues.publicId(),
    sourceUserNote: {
      id: userNote._id,
    },
    note: userNote.note,
    permissions: {
      user: {
        readOnly: false,
      },
      guest: {
        readOnly: false,
      },
    },
    expireAt: faker.date.future({
      years: 1,
    }),
    expireAccessCount: 100,
  };
}

export function createShareNoteLink(
  userNote: UserNoteSchema,
  options?: FakeShareNoteLinkDataOptions
) {
  const shareNoteLink = fakeShareNoteLinkData(userNote, options);
  queuePopulate(async () => {
    await mongoCollections[CollectionName.ShareNoteLinks].insertOne(shareNoteLink);
  });
  return shareNoteLink;
}

export function createShareNoteLinkMany(
  userNotes: UserNoteSchema[],
  options?: FakeShareNoteLinkDataOptions
) {
  const shareNoteLinks = userNotes.map((userNote) =>
    fakeShareNoteLinkData(userNote, options)
  );
  queuePopulate(async () => {
    await mongoCollections[CollectionName.ShareNoteLinks].insertMany(shareNoteLinks);
  });
  return shareNoteLinks;
}

interface PopulateUserWithNotesOptions {
  noteMany?: CreateNoteManyOptions;
  collabText?: FakeCollabTextDataOptions;
  userNote?: FakeUserNoteDataOptions;
  shareNoteLink?: FakeShareNoteLinkDataOptions | false;
}

export function populateUserWithNotes(
  notesCount: number,
  collabTextKeys: string[],
  options?: PopulateUserWithNotesOptions
) {
  const user = createUser();
  const collabTexts = createCollabTextMany(
    user,
    notesCount * collabTextKeys.length,
    options?.collabText
  );
  const notes = createNoteMany(
    user,
    [...new Array<undefined>(notesCount)].map((_, i) =>
      Object.fromEntries(
        collabTextKeys.map((name, j) => [
          name,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          collabTexts[i * collabTextKeys.length + j]!,
        ])
      )
    ),
    options?.noteMany
  );

  const userNotes = createUserNoteMany(user, notes, options?.userNote);

  const shareNoteLinks =
    options?.shareNoteLink !== false
      ? createShareNoteLinkMany(userNotes, options?.shareNoteLink)
      : [];

  user.notes.category.default.order = userNotes.map(({ _id }) => _id);

  return {
    user,
    collabTexts,
    notes,
    userNotes,
    shareNoteLinks,
  };
}

export function addExistingNoteToExistingUser(
  user: UserSchema,
  note: NoteSchema,
  options?: FakeUserNoteDataOptions
) {
  const userNote = createUserNote(user, note, options);

  user.notes.category.default.order.push(userNote._id);

  return userNote;
}

interface PopulateNoteToUserOptions {
  collabText?: FakeCollabTextDataOptions;
  note?: FakeNoteDataOptions;
  userNote?: FakeUserNoteDataOptions;
}

export function populateNoteToUser(
  user: UserSchema,
  collabTextKeys: string[],
  options?: PopulateNoteToUserOptions
) {
  const collabTexts = createCollabTextMany(
    user,
    collabTextKeys.length,
    options?.collabText
  );
  const note = createNote(
    user,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Object.fromEntries(collabTextKeys.map((name, i) => [name, collabTexts[i]!])),
    options?.note
  );

  const userNote = addExistingNoteToExistingUser(user, note, options?.userNote);

  return {
    collabTexts,
    note,
    userNote,
  };
}
