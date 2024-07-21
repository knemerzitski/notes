/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';

import {
  mongoCollections,
  resetDatabase,
} from '../../../__test__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../__test__/helpers/mongodb/populate/populate-queue';
import { NoteCategory, NoteTextField } from '../../../graphql/types.generated';
import { CollectionName } from '../../collections';
import { getNotesArrayPath, UserSchema } from '../../schema/user';
import { UserNoteSchema } from '../../schema/user-note';

import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from './relayPaginateUserNotesArray';

let user: UserSchema;
let userNotes: UserNoteSchema[];

beforeAll(async () => {
  await resetDatabase();
  faker.seed(677876);

  const populateResult = populateNotes(10, {
    note(noteIndex) {
      return {
        override: {
          publicId: `publicId_${noteIndex}`,
        },
      };
    },
  });
  user = populateResult.user;
  userNotes = populateResult.data.map(({ userNote }) => userNote);

  await populateExecuteAll();
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
              collabTexts: Object.values(NoteTextField),
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
              collabTexts: Object.values(NoteTextField),
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
