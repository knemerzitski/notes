/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ObjectId } from 'mongodb';
import { assert, beforeAll, describe, expect, it } from 'vitest';

import { isNonEmptyArray } from '../../../../utils/src/array/is-non-empty-array';

import { mongoDB } from '../../__tests__/helpers/mongodb/instance';

import {
  CursorArrayPaginationInput,
  CursorArrayPaginationAggregateResult,
  SliceAfterAggregateResult,
  SliceBeforeAggregateResult,
  sliceAfter,
  sliceBefore,
  sliceFirst,
  sliceLast,
  cursorArrayPagination,
} from './cursor-array-pagination';

interface SubDocument {
  key: number;
}

interface ArrayDocument {
  direct: string[];
  subdoc: SubDocument[];
  deep: {
    arr: string[];
  };
  simple: string[];
}

describe('cursorArrayPagination', () => {
  const arrayCollection = mongoDB.collection<ArrayDocument>('array');
  // Each array has 10 elements
  const document: ArrayDocument = {
    direct: ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18'],
    subdoc: [
      {
        key: 2,
      },
      {
        key: 3,
      },
      {
        key: 4,
      },
      {
        key: 5,
      },
      {
        key: 6,
      },
      {
        key: 7,
      },
      {
        key: 8,
      },
      {
        key: 9,
      },
      {
        key: 10,
      },
      {
        key: 11,
      },
    ],
    deep: {
      arr: ['d_0', 'd_1', 'd_2', 'd_3', 'd_4', 'd_5', 'd_6', 'd_7', 'd_8', 'd_9'],
    },
    simple: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  };
  let documentId: ObjectId;

  beforeAll(async () => {
    await arrayCollection.deleteMany();

    const result = await arrayCollection.insertOne(document);
    documentId = result.insertedId;
  });

  describe('sliceFirst', () => {
    it.each([
      // ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18'],
      [-1, 'error'],
      [0, 'error'],
      [1, ['0']],
      [2, ['0', '2']],
      [7, ['0', '2', '4', '6', '8', '10', '12']],
      [10, ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18']],
      [11, ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18']],
    ])('%s => %s', async (first, expected) => {
      try {
        const results = await arrayCollection
          .aggregate<{ items: unknown }>([
            {
              $match: {
                _id: documentId,
              },
            },
            {
              $project: {
                items: sliceFirst('direct', first),
              },
            },
          ])
          .toArray();
        expect(results[0]?.items).toStrictEqual(expected);
      } catch (err) {
        if (expected !== 'error') {
          throw err;
        }
      }
    });
  });

  describe('sliceAfter', () => {
    it.each<[[number, number | undefined][], number[][] | 'error']>([
      // [2,3,4,5,6,7,8,9,10,11]
      [[[-100, 2]], []],
      [[[5, -1]], 'error'],
      [[[2, 2]], [[3, 4]]],
      [[[5, 4]], [[6, 7, 8, 9]]],
      [[[9, 2]], [[10, 11]]],
      [[[10, 1]], [[11]]],
      [[[10, 15]], [[11]]],
      [[[11, 2]], []],
      [[[6, undefined]], [[7, 8, 9, 10, 11]]],
      [
        [
          [4, 2],
          [9, 1],
        ],
        [[5, 6], [10]],
      ],
      [
        [
          [8, 4],
          [2, 2],
        ],
        [
          [9, 10, 11],
          [3, 4],
        ],
      ],
    ])('after %s first %s => %s', async (slices, expected) => {
      try {
        const sliceList = slices.map(([key, first]) => ({ after: key, first }));
        assert(isNonEmptyArray(sliceList));

        const results = await arrayCollection
          .aggregate<{
            slices: SliceAfterAggregateResult<SubDocument>;
          }>([
            {
              $match: {
                _id: documentId,
              },
            },
            {
              $project: {
                slices: sliceAfter({
                  arrayFieldPath: 'subdoc',
                  itemPath: 'key',
                  sliceList,
                }),
              },
            },
          ])
          .toArray();

        const resultSlices = results[0]?.slices;
        assert(resultSlices != null);

        let sizeAccumulator = 0;
        for (let i = 0; i < expected.length; i++) {
          const size: number | undefined = resultSlices.sizes[i];
          assert(size != null);
          const arraySlice = resultSlices.array.slice(
            sizeAccumulator,
            sizeAccumulator + size
          );
          sizeAccumulator += size;

          const expectedSlice = expected[i];

          expect(arraySlice.map((item) => item.key)).toStrictEqual(expectedSlice);
        }
        if (expected.length === 0) {
          expect(resultSlices.array).toStrictEqual(expected);
        }
      } catch (err) {
        if (expected !== 'error') {
          throw err;
        }
      }
    });
  });

  describe('sliceLast', () => {
    it.each([
      // ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18'],
      [-1, 'error'],
      [0, 'error'],
      [1, ['18']],
      [3, ['14', '16', '18']],
      [7, ['6', '8', '10', '12', '14', '16', '18']],
      [10, ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18']],
      [11, ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18']],
    ])('%s => %s', async (last, expected) => {
      try {
        const results = await arrayCollection
          .aggregate<{ items: unknown }>([
            {
              $match: {
                _id: documentId,
              },
            },
            {
              $project: {
                items: sliceLast('direct', last),
              },
            },
          ])
          .toArray();
        expect(results[0]?.items).toStrictEqual(expected);
      } catch (err) {
        if (expected !== 'error') {
          throw err;
        }
      }
    });
  });

  describe('sliceBefore', () => {
    it.each<[[string, number | undefined][], string[][] | 'error']>([
      // ['d_0', 'd_1', 'd_2', 'd_3', 'd_4', 'd_5', 'd_6', 'd_7', 'd_8', 'd_9']
      [[['d_1', -1]], 'error'],
      [[['unknown_key', 2]], []],
      [[['d_2', 2]], [['d_0', 'd_1']]],
      [[['d_2', 3]], [['d_0', 'd_1']]],
      [[['d_2', 4]], [['d_0', 'd_1']]],
      [[['d_2', 5]], [['d_0', 'd_1']]],
      [[['d_9', 3]], [['d_6', 'd_7', 'd_8']]],
      [[['d_6', 2]], [['d_4', 'd_5']]],
      [[['d_6', undefined]], [['d_0', 'd_1', 'd_2', 'd_3', 'd_4', 'd_5']]],
      [
        [
          ['d_3', 2],
          ['d_9', 3],
        ],
        [
          ['d_1', 'd_2'],
          ['d_6', 'd_7', 'd_8'],
        ],
      ],
    ])('before %s last %s => %s', async (slices, expected) => {
      const sliceList = slices.map(([before, last]) => ({
        before,
        last,
      }));
      assert(isNonEmptyArray(sliceList));

      try {
        const results = await arrayCollection
          .aggregate<{ slices: SliceBeforeAggregateResult<string> }>([
            {
              $match: {
                _id: documentId,
              },
            },
            {
              $project: {
                slices: sliceBefore({
                  arrayFieldPath: 'deep.arr',
                  sliceList,
                }),
              },
            },
          ])
          .toArray();

        const resultSlices = results[0]?.slices;
        assert(resultSlices != null);

        let sizeAccumulator = 0;
        for (let i = 0; i < expected.length; i++) {
          const size: number | undefined = resultSlices.sizes[i];
          assert(size != null);
          const arraySlice = resultSlices.array.slice(
            sizeAccumulator,
            sizeAccumulator + size
          );
          sizeAccumulator += size;

          const expectedSlice = expected[i];

          expect(arraySlice).toStrictEqual(expectedSlice);
        }
        if (expected.length === 0) {
          expect(resultSlices.array).toStrictEqual(expected);
        }
      } catch (err) {
        if (expected !== 'error') {
          throw err;
        }
      }
    });
  });

  describe('cursorArrayPagination', () => {
    describe('valid input', () => {
      it.each<{
        input: Omit<
          CursorArrayPaginationInput<string>,
          'arrayFieldPath' | 'searchExpression'
        >;
        expectedOutput: Partial<CursorArrayPaginationAggregateResult<string>>;
      }>([
        // ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        {
          input: {
            paginations: [],
          },
          expectedOutput: {
            array: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
          },
        },
        {
          input: {
            paginations: [
              {
                after: '100',
                first: 2,
              },
            ],
          },
          expectedOutput: {
            array: [],
            sizes: [0, 0, 0],
          },
        },
        {
          input: {
            paginations: [
              {
                first: 4,
              },
            ],
          },
          expectedOutput: {
            array: ['0', '1', '2', '3'],
            sizes: [4, 0],
          },
        },
        {
          input: {
            paginations: [
              {
                last: 3,
              },
            ],
          },
          expectedOutput: {
            array: ['7', '8', '9'],
            sizes: [0, 3],
          },
        },
        {
          input: {
            paginations: [
              {
                first: 4,
                after: '3',
              },
            ],
          },
          expectedOutput: {
            array: ['4', '5', '6', '7'],
            sizes: [0, 0, 4],
          },
        },
        {
          input: {
            paginations: [
              {
                last: 3,
                before: '6',
              },
            ],
          },
          expectedOutput: {
            array: ['3', '4', '5'],
            sizes: [0, 0, 3],
          },
        },
        {
          input: {
            maxLimit: 3,
            defaultSlice: 'start',
          },
          expectedOutput: {
            array: ['0', '1', '2'],
          },
        },
        {
          input: {
            maxLimit: 3,
            defaultSlice: 'end',
          },
          expectedOutput: {
            array: ['7', '8', '9'],
          },
        },
        {
          input: {
            paginations: [
              {
                last: 2,
              },
              {
                first: 3,
                after: '3',
              },
              {
                first: 1,
                after: '8',
              },
              {
                first: 4,
              },
              {
                last: 1,
                before: 'invalid',
              },
              {
                last: 3,
                before: '7',
              },
              {
                first: 2,
              },
            ],
          },
          expectedOutput: {
            array: ['0', '1', '2', '3', '8', '9', '4', '5', '6', '9', '4', '5', '6'],
            sizes: [4, 2, 3, 1, 0, 3],
          },
        },
        {
          input: {
            paginations: [
              {
                first: 3,
              },
              {
                first: 5,
              },
            ],
          },
          expectedOutput: {
            array: ['0', '1', '2', '3', '4'],
            sizes: [5, 0],
          },
        },
      ])('input $input => $expectedOutput', async ({ input, expectedOutput }) => {
        const pagination = cursorArrayPagination({
          arrayFieldPath: 'simple',
          ...input,
        });

        const results = await arrayCollection
          .aggregate<{ paginations: CursorArrayPaginationAggregateResult<SubDocument> }>([
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
        const pagination = cursorArrayPagination({
          arrayFieldPath: 'nonexistant.invalid',
          paginations: [p],
        });

        const results = await arrayCollection
          .aggregate<{ paginations: CursorArrayPaginationAggregateResult<SubDocument> }>([
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
          sizes: expect.any(Array),
        });
      });
    });
  });
});
