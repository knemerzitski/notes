import { it, expect } from 'vitest';
import mergedConsecutiveOrdered from './mergedConsecutiveOrdered';

it.each([
  [[1, 2, 3], [5, 6, 7], undefined],
  [
    [2, 3, 4],
    [5, 6, 7],
    [2, 3, 4, 5, 6, 7],
  ],
  [
    [3, 4, 5],
    [5, 6, 7],
    [3, 4, 5, 6, 7],
  ],
  [
    [4, 5, 6],
    [5, 6, 7],
    [4, 5, 6, 7],
  ],
  [
    [5, 6, 7],
    [5, 6, 7],
    [5, 6, 7],
  ],
  [
    [6, 7, 8],
    [5, 6, 7],
    [5, 6, 7, 8],
  ],
  [
    [7, 8, 9],
    [5, 6, 7],
    [5, 6, 7, 8, 9],
  ],
  [
    [8, 9, 10],
    [5, 6, 7],
    [5, 6, 7, 8, 9, 10],
  ],
  [[9, 10, 11], [5, 6, 7], undefined],
  [
    [6, 7],
    [5, 6, 7, 8],
    [5, 6, 7, 8],
  ],
  [
    [4, 5, 6, 7, 8],
    [5, 6, 7],
    [4, 5, 6, 7, 8],
  ],
  [
    [5, 6, 7],
    [3, 4, 5, 6, 7, 8, 9, 10],
    [3, 4, 5, 6, 7, 8, 9, 10],
  ],
  [[], [5, 6, 7], [5, 6, 7]],
  [[5, 6, 7], [], [5, 6, 7]],
])('mergedConsecutiveOrdered(%s,%s) => %s', (arr1, arr2, expected) => {
  expect(mergedConsecutiveOrdered(arr1, arr2, (item) => item)).toStrictEqual(expected);
});
