import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';
import { assert, beforeAll, describe, expect, it } from 'vitest';

import { mongoDB } from '../../../__test__/helpers/mongodb/mongodb';

import relayArrayPagination, { RelayArrayPaginationInput } from './relayArrayPagination';
import relayMultiArrayPaginationConcat, {
  RelayMultiArrayPaginationConcatOutput,
} from './relayMultiArrayPaginationConcat';

type ArrayKey = 'items' | 'deep.sticky';

interface ArrayDocument {
  items: number[];
  deep: {
    sticky: number[];
  };
}

describe('relayMultiArrayPaginationConcat', () => {
  const arrayCollection = mongoDB.collection<ArrayDocument>('array');
  // Each array has 10 elements
  const document: ArrayDocument = {
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    deep: {
      sticky: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    },
  };
  let documentId: ObjectId;

  beforeAll(async () => {
    await arrayCollection.deleteMany();

    const result = await arrayCollection.insertOne(document);
    documentId = result.insertedId;
  });

  it.each<{
    input: Partial<
      Record<
        ArrayKey,
        Omit<RelayArrayPaginationInput<number>, 'arrayFieldPath' | 'searchExpression'>
      >
    >;
    expectedOutput: Partial<RelayMultiArrayPaginationConcatOutput<number>>;
  }>([
    {
      input: {
        items: {
          paginations: [
            {
              first: 2,
            },
          ],
        },
        'deep.sticky': {
          paginations: [
            {
              first: 2,
            },
          ],
        },
      },
      expectedOutput: {
        array: [1, 2, 10, 11],
        multiSizes: [
          [2, 0],
          [2, 0],
        ],
      },
    },
    {
      input: {
        items: {},
        'deep.sticky': {
          paginations: [
            {
              first: 2,
            },
          ],
        },
      },
      expectedOutput: {
        array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        multiSizes: [9, [2, 0]],
      },
    },
    {
      input: {
        'deep.sticky': {
          paginations: [
            {
              first: 2,
            },
            {
              last: 2,
            },
          ],
        },
        items: {
          paginations: [
            {
              after: 5,
              first: 2,
            },
            {
              first: 3,
            },
          ],
        },
      },
      expectedOutput: {
        array: [10, 11, 18, 19, 1, 2, 3, 6, 7],
        multiSizes: [
          [2, 2],
          [3, 0, 2],
        ],
      },
    },
  ])('input $input => $expectedOutput', async ({ input, expectedOutput }) => {
    const pipeline = [
      {
        $match: {
          _id: documentId,
        },
      },
      {
        $project: {
          ...mapObject(input, (key, pagination) => {
            return [
              `paginations.${key}`,
              relayArrayPagination({
                arrayFieldPath: key,
                ...pagination,
              }),
            ];
          }),
        },
      },
      {
        $project: {
          paginations: relayMultiArrayPaginationConcat({
            paths: Object.keys(input).map((key) => `paginations.${key}`),
          }),
        },
      },
    ];

    const results = await arrayCollection
      .aggregate<{
        paginations: RelayMultiArrayPaginationConcatOutput<number>;
      }>(pipeline)
      .toArray();

    assert(results[0] != null);
    expect(results[0].paginations).toStrictEqual(expectedOutput);
  });
});
