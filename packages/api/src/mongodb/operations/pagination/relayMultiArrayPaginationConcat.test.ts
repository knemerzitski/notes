import { describe, expect, it } from 'vitest';
import { RelayArrayPaginationInput } from './relayArrayPagination';
import {
  RelayMultiArrayPaginationConcatOutput,
  multiRelayArrayPaginationMapOutputToInput,
} from './relayMultiArrayPaginationConcat';

type ArrayKey = 'items' | 'deep.sticky';

describe('multiRelayArrayPaginationMapOutputToInput', () => {
  it.each<{
    input: Record<ArrayKey, RelayArrayPaginationInput<number>['paginations']>;
    output: RelayMultiArrayPaginationConcatOutput<number>;
    expected: Record<ArrayKey, number[][]>;
  }>([
    {
      input: {
        items: [
          {
            first: 2,
          },
        ],
        'deep.sticky': [
          {
            first: 2,
          },
        ],
      },
      output: {
        array: [1, 2, 10, 11],
        multiSizes: [
          [2, 0],
          [2, 0],
        ],
      },
      expected: {
        items: [[1, 2]],
        'deep.sticky': [[10, 11]],
      },
    },
    {
      input: {
        items: [],
        'deep.sticky': [
          {
            first: 2,
          },
        ],
      },
      output: {
        array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        multiSizes: [9, [2, 0]],
      },
      expected: {
        items: [[1, 2, 3, 4, 5, 6, 7, 8, 9]],
        'deep.sticky': [[10, 11]],
      },
    },

    {
      input: {
        'deep.sticky': [
          {
            first: 2,
          },
          {
            last: 2,
          },
        ],
        items: [
          {
            after: 5,
            first: 2,
          },
          {
            first: 3,
          },
        ],
      },
      output: {
        array: [10, 11, 18, 19, 1, 2, 3, 6, 7],
        multiSizes: [
          [2, 2],
          [3, 0, 2],
        ],
      },
      expected: {
        'deep.sticky': [
          [10, 11],
          [18, 19],
        ],
        items: [
          [6, 7],
          [1, 2, 3],
        ],
      },
    },
  ])('(%s,%s) => %s', ({ input, output, expected }) => {
    expect(multiRelayArrayPaginationMapOutputToInput(input, output)).toStrictEqual(
      expected
    );
  });
});
