/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { it, expect, describe } from 'vitest';

import { binarySearchIndexOf } from './binary-search';

const cmp = (a: number, b: number) => a - b;

describe('exact', () => {
  it.each([
    [[1, 2, 3, 4, 5], 1, 0],
    [[1, 2, 3, 4, 5], 2, 1],
    [[1, 2, 3, 4, 5], 3, 2],
    [[1, 2, 3, 4, 5], 4, 3],
    [[1, 2, 3, 4, 5], 5, 4],
    [[1, 2, 3, 4], 1, 0],
    [[1, 2, 3, 4], 2, 1],
    [[1, 2, 3, 4], 3, 2],
    [[1, 2, 3, 4], 4, 3],
  ])('(%s,%s) => %s', (arr, item, expectedIndex) => {
    expect(binarySearchIndexOf(arr, item, cmp)).toStrictEqual({
      index: expectedIndex,
      exists: true,
    });
  });
});

describe('insertion index', () => {
  it.each([
    [[2, 3, 4, 5], 1, 0],
    [[1, 3, 4, 5], 2, 1],
    [[1, 2, 4, 5], 3, 2],
    [[1, 2, 3, 5], 4, 3],
    [[1, 2, 3, 4], 5, 4],
    [[2, 3, 4, 5, 6], 1, 0],
    [[1, 3, 4, 5, 6], 2, 1],
    [[1, 2, 4, 5, 6], 3, 2],
    [[1, 2, 3, 5, 6], 4, 3],
    [[1, 2, 3, 4, 6], 5, 4],
    [[1, 2, 3, 4, 5], 6, 5],
  ])('(%s,%s) => %s', (arr, item, expectedIndex) => {
    const searchResult = binarySearchIndexOf(arr, item, cmp);
    expect(searchResult).toStrictEqual({
      index: expectedIndex,
      exists: false,
    });

    const expectedSorted = [...arr, item].sort();
    arr.splice(searchResult.index, 0, item);
    expect(arr).toStrictEqual(expectedSorted);
  });
});

describe('insertion index reversed', () => {
  const cmpReversed = (a: number, b: number) => b - a;

  it.each([
    [[5, 4, 3, 2], 1, 4],
    [[5, 4, 3, 1], 2, 3],
    [[5, 4, 2, 1], 3, 2],
    [[5, 3, 2, 1], 4, 1],
    [[4, 3, 2, 1], 5, 0],
  ])('(%s,%s) => %s', (arr, item, expectedIndex) => {
    const searchResult = binarySearchIndexOf(arr, item, cmpReversed);
    expect(searchResult).toStrictEqual({
      index: expectedIndex,
      exists: false,
    });

    const expectedSorted = [...arr, item].sort(cmpReversed);
    arr.splice(searchResult.index, 0, item);
    expect(arr).toStrictEqual(expectedSorted);
  });
});
