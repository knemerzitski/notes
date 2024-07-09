/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';

import { NoteCategory } from '../../../graphql/types.generated';
import { mongoCollections, resetDatabase } from '../../../test/helpers/mongodb';
import {
  populateWithCreatedData,
  populateUserWithNotes,
} from '../../../test/helpers/mongodb/populate';
import { CollectionName } from '../../collections';
import { getNotesArrayPath, UserSchema } from '../../schema/user';
import { UserNoteSchema } from '../../schema/user-note';

import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from './relayPaginateUserNotesArray';

enum TextFields {
  TITLE = 'title',
  CONTENT = 'content',
}

let user: UserSchema;
let userNotes: UserNoteSchema[];

beforeAll(async () => {
  await resetDatabase();
  faker.seed(677876);

  const { user: tmpUser, userNotes: tmpUserNotes } = populateUserWithNotes(
    10,
    Object.values(TextFields),
    {
      collabText: {
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
  const results = await mongoCollections[CollectionName.USERS]
    .aggregate<RelayPaginateUserNotesArrayOuput<UserNoteSchema>>([
      {
        $match: {
          _id: user._id,
        },
      },
      ...relayPaginateUserNotesArray({
        pagination: {
          [getNotesArrayPath(NoteCategory.DEFAULT)]: {},
        },
        userNotes: {
          userNoteCollctionName:
            mongoCollections[CollectionName.USER_NOTES].collectionName,
          userNoteLookupInput: {
            note: {
              collectionName: mongoCollections[CollectionName.NOTES].collectionName,
            },
            collabText: {
              collectionName:
                mongoCollections[CollectionName.COLLAB_TEXTS].collectionName,
              collabTexts: Object.values(TextFields),
            },
          },
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect(result).toMatchObject({
    userNotes: {
      array: expect.any(Array),
      multiSizes: [10],
    },
  });
  expect(result.userNotes.array).toHaveLength(10);
});

it('paginates notes', async () => {
  const results = await mongoCollections[CollectionName.USERS]
    .aggregate<RelayPaginateUserNotesArrayOuput<UserNoteSchema>>([
      {
        $match: {
          _id: user._id,
        },
      },
      ...relayPaginateUserNotesArray({
        pagination: {
          [getNotesArrayPath(NoteCategory.DEFAULT)]: {
            paginations: [
              {
                before: userNotes[5]?._id,
                last: 2,
              },
            ],
          },
        },
        userNotes: {
          userNoteCollctionName:
            mongoCollections[CollectionName.USER_NOTES].collectionName,
          userNoteLookupInput: {
            note: {
              collectionName: mongoCollections[CollectionName.NOTES].collectionName,
            },
            collabText: {
              collectionName:
                mongoCollections[CollectionName.COLLAB_TEXTS].collectionName,
              collabTexts: Object.values(TextFields),
            },
          },
        },
      }),
    ])
    .toArray();

  const result = results[0];
  assert(result != null);

  expect(result.userNotes.array.map((userNote) => userNote.note.publicId)).toStrictEqual([
    'publicId_3',
    'publicId_4',
  ]);
});
