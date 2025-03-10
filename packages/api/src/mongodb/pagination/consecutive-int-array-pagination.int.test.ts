import { ObjectId } from 'mongodb';
import { assert, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { mongoDB } from '../../__tests__/helpers/mongodb/instance';

import {
  BoundPaginationUnion,
  consecutiveIntArrayPagination,
} from './consecutive-int-array-pagination';
import {
  CursorArrayPaginationInput,
  CursorArrayPaginationAggregateResult,
} from './cursor-array-pagination';
import { CursorAfterBoundPagination, CursorBeforeBoundPagination } from './cursor-struct';

interface ArrayDocument {
  items: number[];
}

describe('consecutiveIntArrayPagination', () => {
  const arrayCollection = mongoDB.collection<ArrayDocument>('array');
  const document: ArrayDocument = {
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  };
  let documentId: ObjectId;

  beforeAll(async () => {
    await arrayCollection.deleteMany();

    const result = await arrayCollection.insertOne(document);
    documentId = result.insertedId;
  });

  describe('valid path', () => {
    it.each<{
      input: Omit<
        CursorArrayPaginationInput<number>,
        'arrayFieldPath' | 'searchExpression'
      >;
      expectedOutput: Partial<CursorArrayPaginationAggregateResult<number>>;
    }>([
      // [1, 2, 3, 4, 5, 6, 7, 8, 9]
      {
        input: {
          paginations: [
            {
              first: 3,
            },
          ],
        },
        expectedOutput: {
          array: [1, 2, 3],
          sizes: [3, 0],
        },
      },
      {
        input: {
          paginations: [
            {
              after: 3,
              first: 3, // [4,5,6]
            },
            {
              first: 4, // [1, 2, 3, 4]
            },
            {
              last: 4, // [6, 7, 8, 9]
            },
          ],
        },
        expectedOutput: {
          array: [1, 2, 3, 4, 6, 7, 8, 9, 5],
          sizes: [4, 4, 1],
        },
      },
      {
        input: {
          paginations: [
            {
              before: 9,
              last: 2, // [7,8]
            },
            {
              before: 8,
              last: 2, // [6,7]
            },
            {
              first: 1, // [1]
            },
            {
              first: 2, // [1,2]
            },
            {
              before: 5,
              last: 1, // [4]
            },
          ],
        },
        expectedOutput: {
          array: [1, 2, 4, 6, 7, 8],
          sizes: [2, 0, 1, 3],
        },
      },
      {
        input: {
          maxLimit: 2,
          paginations: [
            {
              first: 5,
            },
          ],
        },
        expectedOutput: {
          array: [1, 2],
          sizes: [2, 0],
        },
      },
      {
        input: {
          paginations: [],
        },
        expectedOutput: {
          array: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        },
      },
      {
        input: {
          paginations: [
            {
              before: 12,
            },
            {
              after: 5,
            },
          ],
        },
        expectedOutput: {
          array: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        },
      },
      {
        input: {
          paginations: [
            {
              last: 9,
            },
          ],
        },
        expectedOutput: {
          array: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        },
      },
    ])('input $input => $expectedOutput', async ({ input, expectedOutput }) => {
      const pagination = consecutiveIntArrayPagination({
        arrayFieldPath: 'items',
        ...input,
      });

      const results = await arrayCollection
        .aggregate<{ paginations: CursorArrayPaginationAggregateResult<number> }>([
          {
            $match: {
              _id: documentId,
            },
          },
          {
            $project: {
              paginations: pagination,
            },
          },
        ])
        .toArray();

      assert(results[0] != null);
      expect(results[0].paginations).toStrictEqual(expectedOutput);
    });
  });

  describe('returns empty array on non-existant path', () => {
    it.each([
      [
        {
          first: 3,
        },
      ],
      [
        {
          last: 3,
        },
      ],
      [
        {
          after: 3,
        },
      ],
      [
        {
          before: 3,
        },
      ],
      [
        {
          after: 3,
          first: 2,
        },
      ],
      [
        {
          before: 3,
          last: 2,
        },
      ],
    ])('input %s', async (p) => {
      const pagination = consecutiveIntArrayPagination({
        arrayFieldPath: 'nonexistant.invalid',
        paginations: [p],
      });
      const results = await arrayCollection
        .aggregate<{ paginations: CursorArrayPaginationAggregateResult<number> }>([
          {
            $match: {
              _id: documentId,
            },
          },
          {
            $project: {
              paginations: pagination,
            },
          },
        ])
        .toArray();

      assert(results[0] != null);
      expect(results[0].paginations).toMatchObject({
        array: [],
      });
    });
  });
});

describe('BoundPaginationUnion', () => {
  let union: BoundPaginationUnion;

  beforeEach(() => {
    union = new BoundPaginationUnion();
  });

  describe('add', () => {
    it.each<
      [
        (CursorAfterBoundPagination<number> | CursorBeforeBoundPagination<number>)[],
        CursorAfterBoundPagination<number>[],
      ]
    >([
      [[{ after: 3, first: 2 }], [{ after: 3, first: 2 }]],
      [[{ before: 7, last: 2 }], [{ after: 4, first: 2 }]],
      [
        [
          { after: 6, first: 3 },
          { after: 3, first: 2 },
        ],
        [
          { after: 3, first: 2 },
          { after: 6, first: 3 },
        ],
      ],
      [
        [
          { after: 3, first: 2 },
          { after: 6, first: 3 },
        ],
        [
          { after: 3, first: 2 },
          { after: 6, first: 3 },
        ],
      ],
      [
        [
          { after: 2, first: 2 },
          { after: 1, first: 7 },
        ],
        [{ after: 1, first: 7 }],
      ],
      [
        [
          { after: 1, first: 7 },
          { after: 2, first: 2 },
        ],
        [{ after: 1, first: 7 }],
      ],
      [
        [
          { after: 5, first: 4 },
          { after: 2, first: 4 },
        ],
        [{ after: 2, first: 7 }],
      ],
      [
        [
          { after: 5, first: 6 },
          { after: 2, first: 5 },
        ],
        [{ after: 2, first: 9 }],
      ],
    ])('%s => %s', (input, expected) => {
      input.forEach((item) => {
        union.add(item);
      });

      expect(union.slices).toStrictEqual(expected);
    });
  });

  describe('remove', () => {
    it.each<
      [
        (CursorAfterBoundPagination<number> | CursorBeforeBoundPagination<number>)[],
        Parameters<BoundPaginationUnion['remove']>[0],
        number,
        CursorAfterBoundPagination<number>[],
      ]
    >([
      [[{ after: 2, first: 3 }], { after: 1 }, 1, []],
      [[{ after: 5, first: 6 }], { after: 6 }, 5, []],
      [
        [
          { after: 2, first: 2 },
          { after: 5, first: 6 },
        ],
        { after: 6 },
        5,
        [{ after: 2, first: 2 }],
      ],
      [[{ before: 10, last: 3 }], { before: 11 }, 11, []],
      [[{ before: 10, last: 3 }], { before: 8 }, 10, []],
      [
        [
          { before: 10, last: 3 },
          { before: 18, last: 2 },
        ],
        { before: 14 },
        14,
        [{ after: 15, first: 2 }],
      ],
      [
        [
          { before: 10, last: 3 },
          { before: 18, last: 2 },
        ],
        { before: 8 },
        10,
        [{ after: 15, first: 2 }],
      ],
    ])('%s => %s', (addItems, input, output, expected) => {
      addItems.forEach((item) => {
        union.add(item);
      });

      expect(union.remove(input)).toStrictEqual(output);
      expect(union.slices).toStrictEqual(expected);
    });
  });
});
