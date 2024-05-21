import { it, expect, describe } from 'vitest';
import mergeOrderedSet from './mergeOrderedSet';

const cmp = (a: number, b: number) => a - b;
const mergeAdd = (a: number, b: number) => a + b;

describe('with merge', () => {
  it.each([
    [[], [], []],
    [[], [2, 4], [2, 4]],
    [[1, 3], [], [1, 3]],
    [[1, 3], [3], [1, 6]],
    [[1, 3], [2], [1, 2, 3]],
    [[1, 3], [4], [1, 3, 4]],
    [
      [1, 2, 3],
      [3, 4],
      [1, 2, 6, 4],
    ],
    [
      [1, 3, 5, 7, 11],
      [0, 2, 4, 5, 6, 8, 12],
      [0, 1, 2, 3, 4, 10, 6, 7, 8, 11, 12],
    ],
    [
      [1, 2, 6, 7],
      [3, 4, 5],
      [1, 2, 3, 4, 5, 6, 7],
    ],
    [
      [1, 2, 6, 7],
      [3, 4, 5, 7, 9, 10],
      [1, 2, 3, 4, 5, 6, 14, 9, 10],
    ],
  ])('(%s,%s) => %s', (targetSet, insertSet, expectedResult) => {
    mergeOrderedSet(targetSet, insertSet, cmp, mergeAdd);

    expect(targetSet).toStrictEqual(expectedResult);
  });
});
