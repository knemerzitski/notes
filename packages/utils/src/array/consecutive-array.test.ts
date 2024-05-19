import { it, expect, describe } from 'vitest';
import { consecutiveArrayIndexOf, isConsecutiveArray } from './consecutive-array';

const orderFn = (a: number) => a;

describe('consecutiveArrayIndexOf', () => {
  describe('valid array', () => {
    it.each([
      [[3, 4, 5], 2, -1],
      [[3, 4, 5], 3, 0],
      [[3, 4, 5], 4, 1],
      [[3, 4, 5], 5, 2],
      [[3, 4, 5], 6, -1],
    ])('(%s,%s) => %s', (arr, order, expectedIndex) => {
      expect(consecutiveArrayIndexOf(arr, order, orderFn)).toStrictEqual(expectedIndex);
    });
  });

  describe('invalid array calls throws error', () => {
    it.each([[[3, 4, 6, 7], 2]])('(%s,%s)', (arr, order) => {
      expect(() => consecutiveArrayIndexOf(arr, order, orderFn)).toThrow();
    });
  });
});

describe('isConsecutiveArray', () => {
  it.each([
    [[3, 4, 5], true],
    [[3, 4, 6], false],
    [[1, 3], false],
    [[8, 9, 10, 11], true],
  ])('%s => %s', (arr, expected) => {
    expect(isConsecutiveArray(arr, orderFn)).toStrictEqual(expected);
  });
});
