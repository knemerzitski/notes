import { describe, expect, it } from 'vitest';

import { indexOfDiff, lengthOffsetOfDiff } from './diff';

describe('indexOfDiff', () => {
  it.each([
    ['', '', -1],
    ['a', 'a', -1],
    ['a', 'b', 0],
    ['aa', 'ab', 1],
    ['ba', 'aa', 0],
    ['foo', 'fto', 1],
    ['foofoo', 'footee', 3],
    ['foofoo', 'foofoe', 5],
    ['left word right', 'left drow right', 5],
    ['left drow', 'left wo', 5],
    ['a'.repeat(20) + 'f' + 'b'.repeat(24), 'a'.repeat(20) + 't' + 'b'.repeat(24), 20],
    [
      JSON.stringify({
        first: 'foo',
        second: 'bar',
      }),
      JSON.stringify({
        first: 'foo',
        second: 'type bar',
      }),
      25,
    ],
  ])('("%s","%s") => %s', (a, b, expected) => {
    expect(indexOfDiff(a, b)).toStrictEqual(expected);
    if (expected >= 0) {
      expect(a.substring(0, expected)).toStrictEqual(b.substring(0, expected));
      expect(a.substring(expected)).not.toStrictEqual(b.substring(expected));
    } else {
      expect(a).toStrictEqual(b);
    }
  });
});

describe('lengthOffsetOfDiff', () => {
  it.each([
    ['', '', -1],
    ['a', 'a', -1],
    ['a', 'b', 0],
    ['aa', 'ab', 0],
    ['ba', 'aa', 1],
    ['foo', 'fto', 1],
    ['sstoofoo', 'foofoo', 5],
    ['toofoo', 'foofoo', 5],
    ['left word right', 'left drow right', 6],
    ['left drow', 'left wo', 0],
    ['a'.repeat(20) + 'f' + 'b'.repeat(24), 'a'.repeat(20) + 't' + 'b'.repeat(24), 24],
    [
      JSON.stringify({
        first: 'foo',
        second: 'bar',
      }),
      JSON.stringify({
        first: 'foo',
        second: 'type bar',
      }),
      5,
    ],
  ])('("%s","%s") => %s', (a, b, expected) => {
    expect(lengthOffsetOfDiff(a, b)).toStrictEqual(expected);
    if (expected >= 0) {
      expect(a.substring(a.length - expected)).toStrictEqual(
        b.substring(b.length - expected)
      );
      expect(a.substring(0, a.length - expected)).not.toStrictEqual(
        b.substring(0, b.length - expected)
      );
    } else {
      expect(a).toStrictEqual(b);
    }
  });
});
