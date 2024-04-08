import {
  CollabTextDocument,
  DBCollabText,
} from '../../../mongoose/models/collab/collab-text';
import { DBNote, NoteDocument } from '../../../mongoose/models/note';
import { DBUser, UserDocument } from '../../../mongoose/models/user';
import {
  User,
  UserNote,
  Note,
  CollabText,
} from '../../../tests/helpers/mongoose';
import { faker } from '@faker-js/faker';
import { Changeset } from '~collab/changeset/changeset';
import { DBUserNote } from '../../../mongoose/models/user-note';
import { PartialBy } from '~utils/types';

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

export function fakeUserData(): Omit<DBUser, 'notes'> {
  return {
    profile: {
      displayName: faker.person.fullName(),
    },
    thirdParty: {
      google: {
        id: faker.string.numeric({ length: 20 }),
      },
    },
  };
}

export function createUser() {
  const user = new User(fakeUserData());
  queuePopulate(async () => {
    await user.save();
  });
  return user;
}

export function createUserMany(count: number) {
  const users = [...new Array<undefined>(count)].map(() => new User(fakeUserData()));
  queuePopulate(async () => {
    await User.insertMany(users);
  });
  return users;
}

export function fakeUserNoteData(
  user: UserDocument,
  note: NoteDocument
): Omit<DBUserNote, '_id'> {
  return {
    userId: user._id,
    note: {
      id: note._id,
      publicId: note.publicId,
      collabTextId: note.collabTextId,
    },
    readOnly: !!faker.number.int({ max: 1 }),
    preferences: {
      backgroundColor: faker.color.rgb(),
    },
  };
}

export function createUserNote(user: UserDocument, note: NoteDocument) {
  const userNote = new UserNote(fakeUserNoteData(user, note));
  queuePopulate(async () => {
    await userNote.save();
  });
  return userNote;
}

export function createUserNoteMany(user: UserDocument, notes: NoteDocument[]) {
  const userNotes = notes.map((note) => new UserNote(fakeUserNoteData(user, note)));
  queuePopulate(async () => {
    await UserNote.insertMany(userNotes);
  });
  return userNotes;
}

interface FakeNoteDataOptions {
  publicId?: string;
}

export function fakeNoteData(
  user: UserDocument,
  collabTexts: Record<string, CollabTextDocument>,
  options?: FakeNoteDataOptions
): PartialBy<DBNote, 'publicId'> {
  return {
    ownerId: user._id,
    publicId: options?.publicId,
    collabTextId: Object.fromEntries(
      Object.entries(collabTexts).map(([collabTextKey, { _id }]) => [collabTextKey, _id])
    ),
  };
}

export function createNote(
  user: UserDocument,
  collabTexts: Record<string, CollabTextDocument>,
  options?: FakeNoteDataOptions
) {
  const note = new Note(fakeNoteData(user, collabTexts, options));
  queuePopulate(async () => {
    await note.save();
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
  user: UserDocument,
  textFieldsList: Record<string, CollabTextDocument>[],
  options?: CreateNoteManyOptions
) {
  const notes = textFieldsList.map(
    (collabTexts, index) =>
      new Note(
        fakeNoteData(user, collabTexts, {
          publicId:
            options?.enumaratePublicIdByIndex != null
              ? `publicId_${options.enumaratePublicIdByIndex + index}`
              : undefined,
        })
      )
  );
  queuePopulate(async () => {
    await Note.insertMany(notes);
  });
  return notes;
}

export function fakeCollaborativeDocumentRecordData(
  user: UserDocument,
  revision: number
): DBCollabText['records'][0] {
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

interface FakeCollaborativeDocumentDataOptions {
  tailRevision?: number;
  recordsCount?: number;
}

export function fakeCollaborativeDocumentData(
  user: UserDocument,
  options?: FakeCollaborativeDocumentDataOptions
): Omit<DBCollabText, '_id'> {
  const tailRevision = options?.tailRevision ?? faker.number.int({ max: 1000 });
  const recordsCount = options?.recordsCount ?? faker.number.int({ min: 1, max: 10 });
  const headRevision = tailRevision + recordsCount;

  return {
    headDocument: {
      revision: headRevision,
      changeset: Changeset.fromInsertion('head').serialize(),
    },
    tailDocument: {
      revision: tailRevision,
      changeset: Changeset.EMPTY,
    },
    records: [...new Array<undefined>(recordsCount)].map((_, i) =>
      fakeCollaborativeDocumentRecordData(user, tailRevision + i + 1)
    ),
  };
}

export function createCollaborativeDocument(
  user: UserDocument,
  collabDocOptions?: FakeCollaborativeDocumentDataOptions
) {
  const collabDoc = new CollabText(
    fakeCollaborativeDocumentData(user, collabDocOptions)
  );
  queuePopulate(async () => {
    await collabDoc.save();
  });
  return collabDoc;
}

export function createCollaborativeDocumentMany(
  user: UserDocument,
  count: number,
  collabDocOptions?: FakeCollaborativeDocumentDataOptions
) {
  const collabDocs = [...new Array<undefined>(count)].map(
    () => new CollabText(fakeCollaborativeDocumentData(user, collabDocOptions))
  );
  queuePopulate(async () => {
    await CollabText.insertMany(collabDocs);
  });
  return collabDocs;
}

interface CreateUserWithNotesOptions {
  noteMany?: CreateNoteManyOptions;
  collabDoc?: FakeCollaborativeDocumentDataOptions;
}

export function createUserWithNotes(
  notesCount: number,
  collabTexts: string[],
  options?: CreateUserWithNotesOptions
) {
  const user = createUser();
  const collaborativeDocuments = createCollaborativeDocumentMany(
    user,
    notesCount * collabTexts.length,
    options?.collabDoc
  );
  const notes = createNoteMany(
    user,
    [...new Array<undefined>(notesCount)].map((_, i) =>
      Object.fromEntries(
        collabTexts.map((field, j) => [
          field,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          collaborativeDocuments[i * collabTexts.length + j]!,
        ])
      )
    ),
    options?.noteMany
  );

  const userNotes = createUserNoteMany(user, notes);

  user.notes.category.default.order = userNotes.map(({ _id }) => _id);

  return {
    user,
    collaborativeDocuments,
    notes,
    userNotes,
  };
}
