/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { afterEach, assert, beforeAll, expect, it, vi } from 'vitest';

import {
  resetDatabase,
  mongoCollections,
  mongoClient,
} from '../__test__/helpers/mongodb/mongodb';
import {
  populateNotes,
  TestNoteCategory,
} from '../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../__test__/helpers/mongodb/populate/populate-queue';

import { createMongoDBLoaders, MongoDBLoaders } from './loaders';
import { QueryDeep } from './query/query';
import { NoteSchema } from './schema/note/note';
import { QueryableNote } from './schema/note/query/queryable-note';
import { UserSchema } from './schema/user/user';

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;
let note: NoteSchema;

let loaders: MongoDBLoaders;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(73452);

  populateResult = populateNotes(2);
  user = populateResult.user;
  const firstNote = populateResult.data[0]?.note;
  assert(firstNote != null);
  note = firstNote;

  await populateExecuteAll();

  loaders = createMongoDBLoaders({
    client: mongoClient,
    collections: mongoCollections,
  });
});

function databaseCallsCountGetter() {
  const collections = Object.values(mongoCollections);

  const spyCollections = collections.map((col) => vi.spyOn(col, 'aggregate'));

  return () => spyCollections.reduce((sum, col) => sum + col.mock.calls.length, 0);
}

afterEach(() => {
  vi.restoreAllMocks();
});

it('loading note from user primes userNote loader', async () => {
  const dbCallCount = databaseCallsCountGetter();

  expect(dbCallCount()).toStrictEqual(0);

  const userNoteQuery: QueryDeep<QueryableNote> = {
    _id: 1,
    publicId: 1,
  };
  const userResult = await loaders.user.load({
    userId: user._id,
    userQuery: {
      notes: {
        category: {
          [TestNoteCategory.MAIN]: {
            order: {
              items: {
                $pagination: {
                  first: 2,
                },
                ...userNoteQuery,
              },
            },
          },
        },
      },
    },
  });

  expect(userResult).toStrictEqual({
    notes: {
      category: {
        [TestNoteCategory.MAIN]: {
          order: {
            items: [
              {
                _id: expect.any(ObjectId),
                publicId: expect.any(String),
              },
              {
                _id: expect.any(ObjectId),
                publicId: expect.any(String),
              },
            ],
          },
        },
      },
    },
  });

  expect(dbCallCount()).toStrictEqual(1);

  const quickUserNoteResult = await loaders.note.load({
    userId: user._id,
    publicId: note.publicId,
    noteQuery: userNoteQuery,
  });

  expect(quickUserNoteResult).toStrictEqual({
    _id: expect.any(ObjectId),
    publicId: expect.any(String),
  });

  expect(
    dbCallCount(),
    'QueryableUserNoteLoader is not reusing result form QueryableUserLoader'
  ).toStrictEqual(1);
});
