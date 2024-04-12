/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';
import {
  populateWithCreatedData,
  createUserWithNotes,
} from '../../../test/helpers/mongoose/populate';
import {
  CollabText,
  Note,
  User,
  UserNote,
  resetDatabase,
} from '../../../tests/helpers/mongoose';
import { UserDocument } from '../../models/user';
import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from './relayPaginateUserNotesArray';
import { UserNoteDocument } from '../../models/user-note';

enum TextFields {
  TITLE = 'title',
  CONTENT = 'content',
}

let user: UserDocument;
let userNotes: UserNoteDocument[];

beforeAll(async () => {
  await resetDatabase();
  faker.seed(677876);

  const { user: tmpUser, userNotes: tmpUserNotes } = createUserWithNotes(
    10,
    Object.values(TextFields),
    {
      collabDoc: {
        recordsCount: 1,
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
    }
  );
  user = tmpUser;
  userNotes = tmpUserNotes;

  await populateWithCreatedData();
});

it('returns all notes without any paginations', async () => {
  const results = await User.aggregate<RelayPaginateUserNotesArrayOuput<TextFields>>([
    {
      $match: {
        _id: user._id,
      },
    },
    {
      $project: {
        order: '$notes.category.default.order',
      },
    },
    ...relayPaginateUserNotesArray({
      pagination: {
        arrayFieldPath: 'order',
      },
      userNotes: {
        userNoteCollctionName: UserNote.collection.collectionName,
        userNoteLookupInput: {
          note: {
            collectionName: Note.collection.collectionName,
          },
          collabText: {
            collectionName: CollabText.collection.collectionName,
            collabText: Object.values(TextFields),
          },
        },
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  expect(result).toMatchObject({
    userNotes: expect.any(Array),
    sizes: null,
  });
  expect(result.userNotes).toHaveLength(10);
});

it('paginates notes', async () => {
  const results = await User.aggregate<RelayPaginateUserNotesArrayOuput<TextFields>>([
    {
      $match: {
        _id: user._id,
      },
    },
    {
      $project: {
        order: '$notes.category.default.order',
      },
    },
    ...relayPaginateUserNotesArray({
      pagination: {
        arrayFieldPath: 'order',
        paginations: [
          {
            before: userNotes[5]?._id,
            last: 2,
          },
        ],
      },
      userNotes: {
        userNoteCollctionName: UserNote.collection.collectionName,
        userNoteLookupInput: {
          note: {
            collectionName: Note.collection.collectionName,
          },
          collabText: {
            collectionName: CollabText.collection.collectionName,
            collabText: Object.values(TextFields),
          },
        },
      },
    }),
  ]);

  const result = results[0];
  assert(result != null);

  expect(result.userNotes.map((userNote) => userNote.note.publicId)).toStrictEqual([
    'publicId_3',
    'publicId_4',
  ]);
});
