/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { beforeAll, it, expect, assert } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { dropAndCreateSearchIndexes } from '../../__test__/helpers/mongodb/indexes';
import { resetDatabase, mongoCollections } from '../../__test__/helpers/mongodb/mongodb';
import {
  TestCollabTextKey,
  populateNotes,
  populateNotesWithText,
} from '../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { UserSchema } from '../schema/user/user';

import {
  NotesSearchBatchLoadContext,
  QueryableNotesSearchLoadKey,
  notesSearchBatchLoad,
} from './notes-search-batch-load';

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;

let context: NotesSearchBatchLoadContext;

function resultsByText(...texts: string[]) {
  return texts.map((text) => ({
    cursor: expect.any(String),
    note: {
      collabTexts: {
        [TestCollabTextKey.TEXT]: {
          headText: {
            changeset: Changeset.fromInsertion(text).serialize(),
          },
        },
      },
    },
  }));
}

function createLoadKey(
  searchText: string,
  override?: Partial<Omit<QueryableNotesSearchLoadKey, 'searchText'>>
): QueryableNotesSearchLoadKey {
  return {
    userId: user._id,
    searchText,
    ...override,
    searchQuery: {
      cursor: 1,
      ...override?.searchQuery,
      note: {
        collabTexts: {
          [TestCollabTextKey.TEXT]: {
            headText: {
              changeset: 1,
            },
          },
        },
        ...override?.searchQuery?.note,
      },
    },
  };
}

beforeAll(async () => {
  await resetDatabase();
  faker.seed(3325);

  populateResult = populateNotesWithText(['foo foo foo', 'bar', 'foo foo', 'foo']);

  user = populateResult.user;

  await populateExecuteAll();

  await dropAndCreateSearchIndexes();

  context = {
    collections: mongoCollections,
  };
});

it('finds a note, first: 1', async () => {
  const result = await notesSearchBatchLoad(
    [
      createLoadKey('foo', {
        pagination: {
          first: 1,
        },
      }),
    ],
    context
  );

  expect(result).toEqual([resultsByText('foo foo foo')]);
});

it('continues pagination with a cursor', async () => {
  const result1 = await notesSearchBatchLoad(
    [
      createLoadKey('foo', {
        pagination: {
          first: 1,
        },
      }),
    ],
    context
  );

  assert(!(result1[0] instanceof Error));
  const cursor = result1[0]?.[0]?.cursor;
  assert(cursor != null);

  const result2 = await notesSearchBatchLoad(
    [
      createLoadKey('foo', {
        pagination: {
          after: cursor,
          first: 1,
        },
      }),
    ],
    context
  );

  expect(result2).toEqual([resultsByText('foo foo')]);
});

it('returns empty array on no match', async () => {
  const result = await notesSearchBatchLoad([createLoadKey('random')], context);

  expect(result).toEqual([[]]);
});
