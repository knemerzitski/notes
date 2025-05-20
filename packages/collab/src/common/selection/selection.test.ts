import { describe, expect, it } from 'vitest';

import { Selection } from '.';

describe('clamp', () => {
  const length = 20;
  it.each([
    [0, 0, 0, 0],
    [-1, 0, 0, 0],
    [-10, -20, 20, 20],
    [0, -1, 0, 20],
    [-1, 8, 8, 8],
    [4, -1, 4, 20],
    [16, 4, 4, 4],
    [5, 25, 5, 20],
    [25, 25, 20, 20],
  ])('(%s,%s) => (%s,%s)', (start, end, expectedStart, expectedEnd) => {
    expect(Selection.create(start, end).clamp(length)).toEqual({
      start: expectedStart,
      end: expectedEnd,
    });
  });
});

it('add', () => {
  expect(Selection.create(4).add(Selection.create(3))).toStrictEqual(Selection.create(7));
});

it('serialize', () => {
  expect(Selection.create(4).serialize()).toStrictEqual('4');
  expect(Selection.create(4, 5).serialize()).toStrictEqual('4:5');
});

it('parse', () => {
  expect(Selection.parse('6:9')).toStrictEqual(Selection.create(6, 9));
  expect(Selection.parse('5')).toStrictEqual(Selection.create(5));
  expect(Selection.parse('9')).toStrictEqual(Selection.create(9));
});
