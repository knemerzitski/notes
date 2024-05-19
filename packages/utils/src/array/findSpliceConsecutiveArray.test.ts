import { it, expect, describe } from 'vitest';
import findSpliceConsecutiveArray from './findSpliceConsecutiveArray';

const cmp = (a: number, b: number) => a - b;

describe('check return value', () => {
  it.each([
    [
      [1, 2, 3, 6, 7],
      [4, 5],
      {
        start: 3,
        deleteCount: 0,
        items: [4, 5],
      },
      [1, 2, 3, 4, 5, 6, 7],
    ],
    [
      [1, 2, 4, 6, 8, 9, 10],
      [3, 4, 5, 6, 7],
      {
        start: 2,
        deleteCount: 2,
        items: [3, 4, 5, 6, 7],
      },
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    ],
    [[1, 2, 3, 4, 5], [2, 3, 4], undefined, undefined],
  ])('(%s,%s) => %s', (arr, insertArr, expectedResult, expectedArr) => {
    const result = findSpliceConsecutiveArray(arr, insertArr, cmp);
    if (result) {
      expect(result).toStrictEqual(expectedResult);
      arr.splice(result.start, result.deleteCount, ...result.items);
      expect(arr).toStrictEqual(expectedArr);
    } else {
      expect(expectedResult).toBeUndefined();
    }
  });
});

describe('trust applied result', () => {
  it.each([
    [
      [1, 2, 3],
      [5, 6, 7],
      [1, 2, 3, 5, 6, 7],
    ],
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
    [
      [9, 10, 11],
      [5, 6, 7],
      [5, 6, 7, 9, 10, 11],
    ],
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
  ])('(%s,%s) => %s', (arr, insertArr, expectedArr) => {
    const result = findSpliceConsecutiveArray(arr, insertArr, cmp);
    if (result) {
      arr.splice(result.start, result.deleteCount, ...result.items);
    }
    expect(arr).toStrictEqual(expectedArr);
  });
});