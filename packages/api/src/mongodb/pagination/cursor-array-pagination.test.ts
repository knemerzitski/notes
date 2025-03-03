import { string, Struct } from 'superstruct';
import { describe, expect, it } from 'vitest';

import {
  CursorArrayPaginationInput,
  CursorArrayPaginationAggregateResult,
  cursorArrayPaginationMapAggregateResult,
} from './cursor-array-pagination';

function mapAllPaginations<TCursor, TItem>(
  input: CursorArrayPaginationInput<TCursor>['paginations'],
  output: CursorArrayPaginationAggregateResult<TItem>,
  cursor: Struct<TCursor, null>
): (readonly TItem[])[] {
  if (!input || input.length === 0) return [output.array];

  return input.map((pagination) =>
    cursorArrayPaginationMapAggregateResult(pagination, input, output, cursor)
  );
}

describe('cursorArrayPaginationMapAggregateResult', () => {
  it.each<{
    input: CursorArrayPaginationInput<string>['paginations'];
    output: CursorArrayPaginationAggregateResult<string>;
    expected: string[][];
  }>([
    {
      input: [],
      output: {
        array: ['1', '2', '3', '4', '5'],
      },
      expected: [['1', '2', '3', '4', '5']],
    },
    {
      input: [
        {
          first: 3,
        },
        {
          first: 5,
        },
      ],
      output: {
        array: ['3', '4', '5', '6', '7'],
        sizes: [5, 0],
      },
      expected: [
        ['3', '4', '5'],
        ['3', '4', '5', '6', '7'],
      ],
    },
    {
      input: [
        {
          last: 3,
        },
        {
          last: 5,
        },
        {
          first: 1,
        },
      ],
      output: {
        array: ['0', '5', '6', '7', '8', '9'],
        sizes: [1, 5],
      },
      expected: [['7', '8', '9'], ['5', '6', '7', '8', '9'], ['0']],
    },
    {
      input: [
        {
          last: 3,
          before: '6',
        },
      ],
      output: {
        array: ['3', '4', '5'],
        sizes: [0, 0, 3],
      },
      expected: [['3', '4', '5']],
    },
    {
      input: [
        {
          last: 2,
          before: '9',
        },
        {
          last: 3,
          before: '6',
        },
      ],
      output: {
        array: ['7', '8', '3', '4', '5'],
        sizes: [0, 0, 2, 3],
      },
      expected: [
        ['7', '8'],
        ['3', '4', '5'],
      ],
    },
    {
      input: [
        {
          first: 1,
          after: '4',
        },
        {
          last: 2,
          before: '9',
        },
        {
          first: 2,
          after: '3',
        },
        {
          last: 3,
          before: '6',
        },
      ],
      output: {
        array: ['5', '4', '5', '7', '8', '3', '4', '5'],
        sizes: [0, 0, 1, 2, 2, 3],
      },
      expected: [['5'], ['7', '8'], ['4', '5'], ['3', '4', '5']],
    },
    {
      input: [
        {
          first: 5,
        },
        {
          first: 10,
        },
        {
          last: 2,
        },
      ],
      output: {
        array: ['3', '4', '10', '11'],
        sizes: [2, 2],
      },
      expected: [
        ['3', '4'],
        ['3', '4'],
        ['10', '11'],
      ],
    },
    {
      input: [
        {
          first: 1,
        },
        {
          last: 8,
        },
      ],
      output: {
        array: ['3', '9', '10', '11'],
        sizes: [1, 3],
      },
      expected: [['3'], ['9', '10', '11']],
    },
  ])('(%s,%s) => %s', ({ input, output, expected }) => {
    expect(mapAllPaginations(input, output, string())).toStrictEqual(expected);
  });

  it.each<{
    input: CursorArrayPaginationInput<string>['paginations'];
    output: CursorArrayPaginationAggregateResult<string>;
  }>([
    {
      input: [
        {
          last: 3,
        },
        {
          after: '3',
          first: 2,
        },
      ],
      output: {
        array: ['3', '4', '5'],
        sizes: [0, 3],
      },
    },
    {
      input: [
        {
          last: 3,
        },
        {
          before: '3',
        },
      ],
      output: {
        array: ['3', '4', '5'],
        sizes: [0, 3],
      },
    },
  ])('(%s,%s) => error', ({ input, output }) => {
    expect(() => mapAllPaginations(input, output, string())).toThrow();
  });
});
