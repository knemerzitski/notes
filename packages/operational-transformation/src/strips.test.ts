import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Strip } from './strip';
import { IDENTITY, Strips } from './strips';
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

  describe('isRetainIndexesOrdered', () => {
    it.each([
      [['hello', ' world'], true],
      [
        [
          [1, 2],
          [4, 5],
        ],
        true,
      ],
      [
        [
          [5, 6],
          [2, 4],
        ],
        false,
      ],
      [[[2, 3], 1], false],
      [[[1, 2], 'abc', [5, 7], 'bbb'], true],
      [['c', [5, 8], 'abc', [1, 3], 'bbb'], false],
    ])('%s', (input, expected) => {
      expect(toStrips(input).isRetainIndexesOrdered()).toStrictEqual(expected);
    });
  });

  describe('isEqual', () => {
    it('returns true exact same strips', () => {
      expect(toStrips(['abc', [1, 2]]).isEqual(toStrips(['abc', [1, 2]]))).toBeTruthy();
      expect(
        toStrips([4, 'c', [3, 5], 'bs', 'll']).isEqual(
          toStrips([4, 'c', [3, 5], 'bs', 'll'])
        )
      ).toBeTruthy();
    });

    it('returns false for different order', () => {
      expect(toStrips(['abc', [1, 2]]).isEqual(toStrips([[1, 2], 'abc']))).toBeFalsy();
    });

    it('returns false for different value', () => {
      expect(toStrips(['abc', [1, 2]]).isEqual(toStrips([[1, 2], 'abcd']))).toBeFalsy();
      expect(toStrips(['abc', [1, 2]]).isEqual(toStrips([[1, 3], 'abc']))).toBeFalsy();
    });
  });

  describe('IDENTITY', () => {
    it('has empty values', () => {
      expect(IDENTITY.values).toStrictEqual([]);
    });

    it('has length 0', () => {
      expect(IDENTITY.length).toStrictEqual(0);
    });

    it('has maxIndex 0', () => {
      expect(IDENTITY.maxIndex).toStrictEqual(0);
    });

    it('returns empty on slice', () => {
      expect(IDENTITY.slice()).toStrictEqual(Strips.EMPTY);
    });

    it('returns undefined on at', () => {
      expect(IDENTITY.at(5)).toBeUndefined();
    });

    it('returns empty on compact', () => {
      expect(IDENTITY.compact()).toStrictEqual(Strips.EMPTY);
    });

    it('returns troe on isRetainIndexesOrdered', () => {
      expect(IDENTITY.isRetainIndexesOrdered()).toBeTruthy();
    });

    it('only identity is equal to identity', () => {
      expect(IDENTITY.isEqual(IDENTITY)).toBeTruthy();

      expect(toStrips(['abc', 1]).isEqual(IDENTITY)).toBeFalsy();
      expect(IDENTITY.isEqual(toStrips([[2, 4], 'cc']))).toBeFalsy();

      expect(toStrips([]).isEqual(IDENTITY)).toBeFalsy();
      expect(IDENTITY.isEqual(toStrips([]))).toBeFalsy();
    });
  });
});
