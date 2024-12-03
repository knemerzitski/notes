import { describe, expect, it } from 'vitest';

import { weavedReplace } from './weaved-replace';

function isString<T>(value: T): value is T & string {
  return typeof value === 'string';
}

describe('replace newItems that match predicate', () => {
  it.each([
    [[], [], []],
    [[1], [], [1]],
    [['a'], ['b'], ['b']],
    [[], ['a'], ['a']],
    [[1], ['a'], ['a', 1]],
    [[1], ['a', 'b'], ['a', 'b', 1]],
    [
      [1, 2],
      ['a', 'b'],
      ['a', 'b', 1, 2],
    ],
    [
      [1, 2, 'a', 3, 'b', 4],
      ['b', 'a', 'c'],
      [1, 2, 'b', 3, 'a', 'c', 4],
    ],
    [[1, 2, 'a', 3, 'b', 4], [], [1, 2, 3, 4]],
    [[1, 2, 'a', 3, 'b', 4], ['z'], [1, 2, 'z', 3, 4]],
    [['a', 'b', 'c'], ['a'], ['a']],
  ])('%s + %s => %s', (items, newItems, expected) => {
    expect(weavedReplace(newItems, items, isString)).toStrictEqual(expected);
  });
});

describe('insert newItems that do not matching predicate', () => {
  it.each<[(string | number)[], (string | number)[], (string | number)[]]>([
    [['a'], [1, 2], [1, 2]],
    [
      [1, 'b', 2, 'a'],
      ['a', 3, 4, 'b', 'c'],
      [1, 'a', 2, 3, 4, 'b', 'c'],
    ],
  ])('%s + %s => %s', (items, newItems, expected) => {
    expect(weavedReplace(newItems, items, isString)).toStrictEqual(expected);
  });
});
