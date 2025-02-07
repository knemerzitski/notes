import { describe, expect, it } from 'vitest';

import { consecutiveIntArrayPaginationMapAggregateResult } from './consecutive-int-array-pagination';
import {
  CursorArrayPaginationInput,
  CursorArrayPaginationAggregateResult,
} from './cursor-array-pagination';

function mapAllPaginations<TItem>(
  input: CursorArrayPaginationInput<number>['paginations'],
  output: CursorArrayPaginationAggregateResult<TItem>,
  toCursor: (item: TItem) => number
): (readonly TItem[])[] {
  if (!input || input.length === 0) return [output.array];

  return input.map((pagination) =>
    consecutiveIntArrayPaginationMapAggregateResult(pagination, output, toCursor)
  );
}

describe('consecutiveIntArrayPaginationMapAggregateResult', () => {
  it.each<{
    input: CursorArrayPaginationInput<number>['paginations'];
    output: CursorArrayPaginationAggregateResult<number>;
    expected: number[][];
  }>([
    // [1,2,3,4,5,6,7,8,9]
    {
      input: [],
      output: {
        array: [1, 2, 3, 4, 5],
      },
      expected: [[1, 2, 3, 4, 5]],
    },
    {
      input: [
        {
          first: 3, //1,2,3
        },
        {
          after: 2,
          first: 2, // 3,4
        },
      ],
      output: {
        array: [1, 2, 3, 4],
        sizes: [3, 0, 1],
      },
      expected: [
        [1, 2, 3],
        [3, 4],
      ],
    },
    {
      input: [
        {
          first: 3, //1,2,3
        },
        {
          last: 2, // 8,9
        },
      ],
      output: {
        array: [1, 2, 3, 8, 9],
        sizes: [3, 2],
      },
      expected: [
        [1, 2, 3],
        [8, 9],
      ],
    },
    {
      input: [
        {
          after: 6,
        },
        {
          before: 3,
        },
      ],
      output: {
        array: [1, 2, 7, 8, 9],
        sizes: [2, 3],
      },
      expected: [
        [7, 8, 9],
        [1, 2],
      ],
    },
    {
      input: [
        {
          after: 2,
          first: 2, //3,4
        },
        {
          before: 9,
          last: 3,
        },
        {
          first: 2,
        },
        {
          last: 1,
        },
      ],
      output: {
        array: [1, 2, 9, 3, 4, 6, 7, 8],
        sizes: [2, 1, 2, 3],
      },
      expected: [[3, 4], [6, 7, 8], [1, 2], [9]],
    },
    {
      input: [
        {
          after: 5,
          first: 3, //3,4
        },
        {
          before: 8,
          last: 1,
        },
        {
          first: 2,
        },
        {
          last: 1,
        },
        {
          after: 3,
        },
        {
          before: 4,
        },
      ],
      output: {
        array: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        sizes: [3, 6, 0],
      },
      expected: [[6, 7, 8], [7], [1, 2], [9], [4, 5, 6, 7, 8, 9], [1, 2, 3]],
    },
    {
      input: [
        {
          after: 5,
          first: 3, //3,4
        },
        {
          before: 8,
          last: 1,
        },
        {
          before: 5,
          last: 1,
        },
        {
          first: 2,
        },
        {
          last: 1,
        },
        {
          after: 8,
        },
        {
          before: 2,
        },
      ],
      output: {
        array: [1, 2, 9, 4, 6, 7, 8],
        sizes: [2, 1, 1, 3],
      },
      expected: [[6, 7, 8], [7], [4], [1, 2], [9], [9], [1]],
    },
    {
      input: [
        {
          before: 3,
          last: 1,
        },
        {
          before: 5,
        },
        {
          after: 17,
        },
      ],
      output: {
        // 10 elements
        array: [0, 1, 2, 3, 4],
        sizes: [5, 0, 0],
      },
      expected: [[2], [0, 1, 2, 3, 4], []],
    },
    {
      input: [
        {
          before: 11,
          last: 4,
        },
        {
          before: 14,
        },
        {
          after: 17,
        },
      ],
      output: {
        // 10 elements
        array: [0, 1, 2, 3, 4],
        sizes: [5, 0],
      },
      expected: [[], [0, 1, 2, 3, 4], []],
    },
    {
      input: [
        {
          last: 9,
        },
      ],
      output: {
        array: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        sizes: undefined,
      },
      expected: [[1, 2, 3, 4, 5, 6, 7, 8, 9]],
    },
    {
      input: [
        {
          last: 9,
        },
        {
          first: 2,
        },
        { last: 3 },
      ],
      output: {
        array: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        sizes: undefined,
      },
      expected: [
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2],
        [7, 8, 9],
      ],
    },
    {
      input: [
        {
          after: 9,
        },
      ],
      output: {
        array: [11, 12, 13, 14],
        sizes: undefined,
      },
      expected: [[11, 12, 13, 14]],
    },
  ])('(%s,%s) => %s', ({ input, output, expected }) => {
    expect(mapAllPaginations(input, output, (item) => item)).toStrictEqual(expected);
  });
});
