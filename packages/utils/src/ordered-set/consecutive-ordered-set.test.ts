import { it, expect, describe } from 'vitest';

import {
  binarySearchConsecutiveOrderedSubset,
  consecutiveOrderedSetIndexOf,
  isConsecutiveOrderedSet,
} from './consecutive-ordered-set';

const rankFn = (a: number) => a;
const compareFn = (a: number, b: number) => a - b;

describe('consecutiveOrderedSetIndexOf', () => {
  describe('valid set', () => {
    it.each([
      [[3, 4, 5], 2, -1],
      [[3, 4, 5], 3, 0],
      [[3, 4, 5], 4, 1],
      [[3, 4, 5], 5, 2],
      [[3, 4, 5], 6, -1],
    ])('(%s,%s) => %s', (arr, order, expectedIndex) => {
      expect(consecutiveOrderedSetIndexOf(arr, order, rankFn)).toStrictEqual(
        expectedIndex
      );
    });
  });

  describe('invalid set calls throws error', () => {
    it.each([[[3, 4, 6, 7], 2]])('(%s,%s)', (arr, order) => {
      expect(() => consecutiveOrderedSetIndexOf(arr, order, rankFn)).toThrow();
    });
  });
});

describe('isConsecutiveOrderedSet', () => {
  it.each([
    [[3, 4, 5], true],
    [[3, 4, 6], false],
    [[1, 3], false],
    [[8, 9, 10, 11], true],
  ])('%s => %s', (arr, expected) => {
    expect(isConsecutiveOrderedSet(arr, compareFn)).toStrictEqual(expected);
  });
});

describe('binarySearchConsecutiveOrderedSubset', () => {
  describe('start', () => {
    it.each([
      [[], 0, []],
      [[1], 1, [1]],
      [[1, 3], 2, [3]],
      [[2, 4, 5, 7], 3, [4, 5]],
      [[2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 16, 17, 20], 10, [10, 11, 12, 13]],
      [[3, 4, 6, 7, 8, 10, 11, 12, 13, 16], 9, [10, 11, 12, 13]],
    ])('(%s,%s) => %s', (set, end, expectedResult) => {
      const range = binarySearchConsecutiveOrderedSubset(set, rankFn, 'start', 0, end);
      expect(set.slice(range.start, range.end)).toStrictEqual(expectedResult);
    });
  });

  describe('end', () => {
    it.each([
      [[], 0, []],
      [[1], 0, [1]],
      [[1, 3], 0, [1]],
      [[3, 4, 5, 7], 1, [4, 5]],
      [[3, 4, 5, 7, 8], 3, [7, 8]],
      [[3, 4, 5, 7, 8], 2, [5]],
      [
        [1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 18, 19, 21, 22, 23, 24, 28, 29, 30],
        3,
        [6, 7, 8, 9, 10, 11, 12, 13],
      ],
    ])('(%s,%s) => %s', (set, start, expectedResult) => {
      const range = binarySearchConsecutiveOrderedSubset(
        set,
        rankFn,
        'end',
        start,
        set.length
      );
      expect(set.slice(range.start, range.end)).toStrictEqual(expectedResult);
    });
  });
});
