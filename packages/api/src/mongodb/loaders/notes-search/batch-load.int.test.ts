/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { beforeAll, it, expect, assert, describe } from 'vitest';

import { Changeset } from '../../../../../collab/src/changeset';

import { dropAndCreateSearchIndexes } from '../../../__tests__/helpers/mongodb/indexes';
import {
  resetDatabase,
  mongoCollections,
} from '../../../__tests__/helpers/mongodb/mongodb';
import {
  populateNotes,
  populateNotesWithText,
} from '../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../__tests__/helpers/mongodb/populate/populate-queue';
import { DBUserSchema } from '../../schema/user';

import { MongoPartialDeep } from '../../types';

import { QueryableNoteLoaderParams } from '../note/loader';

import { batchLoad } from './batch-load';
import { QueryableNotesSearchLoaderKey } from './loader';

let populateResult: ReturnType<typeof populateNotes>;
let user: DBUserSchema;

let context: QueryableNoteLoaderParams['context'];

function resultsByText(...texts: string[]) {
  return texts.map((text) => ({
    cursor: expect.any(String),
    note: {
      collabText: {
        headText: {
          changeset: Changeset.fromInsertion(text).serialize(),
        },
      },
    },
  }));
}

function createLoaderKey(
  searchText: string,
  override?: MongoPartialDeep<QueryableNotesSearchLoaderKey>
): QueryableNotesSearchLoaderKey {
  return {
    ...override,
    //@ts-expect-error
    id: {
      userId: user._id,
      searchText,
      ...override?.id,
    },
    query: {
      cursor: 1,
      ...override?.query,
      note: {
        //@ts-expect-error
        collabText: {
          headText: {
            changeset: 1,
          },
        },
        ...override?.query?.note,
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

  context = {
    collections: mongoCollections,
  };
});

describe('no search index', () => {
  beforeAll(async () => {
    await dropAndCreateSearchIndexes('only-drop');
  });

  it('returns empty array without search index', async () => {
    const result = await batchLoad(
      [
        createLoaderKey('foo', {
          id: {
            pagination: {
              first: 1,
            },
          },
        }),
      ],
      {
        global: context,
        request: undefined,
      }
    );

    expect(result).toEqual([[]]);
  });
});

describe('search index created', () => {
  beforeAll(async () => {
    await dropAndCreateSearchIndexes();
  });

  it('finds a note, first: 1', async () => {
    const result = await batchLoad(
      [
        createLoaderKey('foo', {
          id: {
            pagination: {
              first: 1,
            },
          },
        }),
      ],
      {
        global: context,
        request: undefined,
      }
    );

    expect(result).toEqual([resultsByText('foo foo foo')]);
  });

  it('continues pagination with a cursor', async () => {
    const result1 = await batchLoad(
      [
        createLoaderKey('foo', {
          id: {
            pagination: {
              first: 1,
            },
          },
        }),
      ],
      {
        global: context,
        request: undefined,
      }
    );

    assert(!(result1[0] instanceof Error));
    const cursor = result1[0]?.[0]?.cursor;
    assert(cursor != null);

    const result2 = await batchLoad(
      [
        createLoaderKey('foo', {
          id: {
            pagination: {
              after: cursor,
              first: 1,
            },
          },
        }),
      ],
      {
        global: context,
        request: undefined,
      }
    );

    expect(result2).toEqual([resultsByText('foo foo')]);
  });

  it('returns empty array on no match', async () => {
    const result = await batchLoad([createLoaderKey('random')], {
      global: context,
      request: undefined,
    });

    expect(result).toEqual([[]]);
  });
});
