/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { afterEach, assert, beforeAll, beforeEach, expect, it, vi } from 'vitest';

import {
  resetDatabase,
  mongoCollections,
  mongoClient,
 mongoCollectionStats } from '../__tests__/helpers/mongodb/instance';
import {
  populateNotes,
  TestNoteCategory,
} from '../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../__tests__/helpers/mongodb/populate/populate-queue';

import { createMongoDBLoaders, MongoDBLoaders } from './loaders';
import { QueryableNote } from './loaders/note/descriptions/note';
import { QueryDeep } from './query/query';
import { DBNoteSchema } from './schema/note';
import { DBUserSchema } from './schema/user';

let populateResult: ReturnType<typeof populateNotes>;
let user: DBUserSchema;
let note: DBNoteSchema;

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

beforeEach(() => {
  mongoCollectionStats.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('loading note from user primes note loader', async () => {
  const noteQuery: QueryDeep<QueryableNote> = {
    _id: 1,
  };
  const userResult = await loaders.user.load({
    id: {
      userId: user._id,
    },
    query: {
      note: {
        categories: {
          [TestNoteCategory.MAIN]: {
            notes: {
              $pagination: {
                first: 2,
              },
              ...noteQuery,
            },
          },
        },
      },
    },
  });

  expect(userResult).toStrictEqual({
    note: {
      categories: {
        [TestNoteCategory.MAIN]: {
          notes: [
            {
              _id: expect.any(ObjectId),
            },
            {
              _id: expect.any(ObjectId),
            },
          ],
        },
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);

  const noteResult = await loaders.note.load({
    id: {
      noteId: note._id,
      userId: user._id,
    },
    query: noteQuery,
  });

  expect(noteResult).toStrictEqual({
    _id: expect.any(ObjectId),
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(1);
});
