import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Strip } from './strip';
import { Strips } from './strips';
import { toStrip, toStrips } from './tests/helpers/convert';

describe('Strips', () => {
  describe('static', () => {
    it('EMPTY has no values', () => {
      expect(Strips.EMPTY.values).toStrictEqual([]);
    });

    it('from uses spread syntax', () => {
      const values = [mock<Strip>(), mock<Strip>(), mock<Strip>()];
      expect(Strips.from(...values)).toStrictEqual(new Strips(values));
    });
  });

  describe('length', () => {
    function createStrips(lengths: number[]): Strip[] {
      return lengths.map((length) =>
        mock<Strip>({
          length,
        })
      );
    }

    it.each([
      ['returns 0 for empty strip', [], 0],
      ['returns sum', [7, 2, 4], 13],
    ])('%s: %s.length = %s', (_msg, nrs, expected) => {
      expect(new Strips(createStrips(nrs)).length).toStrictEqual(expected);
    });
  });

  it('sets values in constructor', () => {
    const values = [mock<Strip>(), mock<Strip>()];
    expect(new Strips(values).values).toStrictEqual(values);
  });

  describe('slice', () => {
    it.each([
      ['returns empty', [], [0, 0], []],
      ['returns start of single string', ['abcdef'], [0, 2], ['ab']],
      ['returns middle of single string', ['abcdef'], [1, 4], ['bcd']],
      ['returns end of single string', ['abcdef'], [4, 6], ['ef']],
      [
        'returns start of string in array middle index',
        ['abcd', 'efghij', 'klmn'],
        [4, 8],
        ['efgh'],
      ],
      [
        'returns middle of string in array middle index',
        ['abcd', 'efghij', 'klmn'],
        [5, 8],
        ['fgh'],
      ],
      [
        'returns end of string in array middle index',
        ['abcd', 'efghij', 'klmn'],
        [6, 10],
        ['ghij'],
      ],
      [
        'returns two sliced strings when indices span across two string',
        ['ab', 'cdefg', 'hijklm', 'no'],
        [4, 9],
        ['efg', 'hi'],
      ],
      [
        'returns start/end sliced and whole inner string when indices span across multiple strings',
        ['ab', 'cd', 'ef', 'gh', 'ij'],
        [3, 7],
        ['d', 'ef', 'g'],
      ],
      [
        'returns from start if end is undefined',
        ['ab', 'cd', 'ef'],
        [3, undefined],
        ['d', 'ef'],
      ],
      [
        'returns identical without arguments',
        ['ab', 'cd', 'ef'],
        [undefined, undefined],
        ['ab', 'cd', 'ef'],
      ],
      ['returns empty for out of bounds index', ['abc', 'de'], [15, 20], []],
      [
        'returns last three characters from negative index',
        ['abc', 'de'],
        [-3, -1],
        ['c', 'de'],
      ],
    ])('%s: %s.slice(%s) = %s', (_msg, strs, [sliceStart, sliceEnd], expected) => {
      expect(toStrips(strs).slice(sliceStart, sliceEnd)).toStrictEqual(
        toStrips(expected)
      );
    });
  });

  describe('at', () => {
    it.each([
      ['first character of second strip', ['abc', 'def'], 4, 'e'],
      ['returns last character', ['abc', 'de'], -1, 'e'],
      ['returns undefined for out of bounds index', ['de'], 10, undefined],
    ])('%s.at(%s) = %s', (_msg, strs, index, expected) => {
      const strip = toStrips(strs).at(index);
      if (expected !== undefined) {
        expect(strip).toStrictEqual(toStrip(expected));
      } else {
        expect(strip).toBeUndefined();
      }
    });
  });

  describe('compact', () => {
    it.each([
      ['concats two strings', ['hello', ' world'], ['hello world']],
      [
        'concats continious strips of strings between indices',
        ['a', 'b', 10, 'c', 'd', 'ef'],
        ['ab', 10, 'cdef'],
      ],
      [
        'concats continious index, range and string',
        [[1, 3], 4, 5, 'ab', 'cd', 6, 7, [8, 14], 'c', 11, 12],
        [[1, 5], 'abcd', [6, 14], 'c', [11, 12]],
      ],
    ])('%s: %s.compact() = %s', (_msg, input, expected) => {
      expect(toStrips(input).compact()).toStrictEqual(toStrips(expected).compact());
    });
  });
});
