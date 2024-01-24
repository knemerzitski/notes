import { describe, expect, it } from 'vitest';
import { mock, mockFn } from 'vitest-mock-extended';

import IndexStrip from './IndexStrip';
import RangeStrip from './RangeStrip';
import StringStrip from './StringStrip';
import Strip from './Strip';
import Strips from './Strips';
import {
  getMockStripValues,
  createMockStrips,
  getMockStripValue,
} from './tests/helpers/strips';

describe('Strips', () => {
  describe('static', () => {
    it('EMPTY has no values', () => {
      expect(Strips.EMPTY.values).toStrictEqual([]);
    });

    it('from uses spread syntax', () => {
      const values = [mock<Strip>(), mock<Strip>(), mock<Strip>()];
      expect(Strips.from(...values)).toStrictEqual(new Strips(values));
    });

    it('fromPOJO multiple values', () => {
      expect(Strips.fromPOJO([5, [2, 4], 'str'])).toStrictEqual(
        Strips.from(new IndexStrip(5), new RangeStrip(2, 4), new StringStrip('str'))
      );
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
    ])('%s: %s.slice(%s) = %s', (_msg, strs, [sliceStart, sliceEnd], expected) => {
      expect(
        getMockStripValues(createMockStrips(strs).slice(sliceStart, sliceEnd))
      ).toStrictEqual(expected);
    });
  });

  describe('at', () => {
    it.each([[['abc', 'def'], 4, 'e']])('%s.at(%s) = %s', (strs, index, expected) => {
      const strips = createMockStrips(strs);
      expect(getMockStripValue(strips.at(index))).toStrictEqual(expected);
    });
  });

  describe('calcMaxIndex', () => {
    function createStrips(maxIndices: number[]): Strip[] {
      return maxIndices.map((maxIndex) =>
        mock<Strip>({
          maxIndex,
        })
      );
    }

    it.each([
      ['returns -1 for empty', [], -1],
      ['returns maximum', [7, 2, 4], 7],
    ])('%s: %s.calcMaxIndex() = %s', (_msg, nrs, expected) => {
      expect(new Strips(createStrips(nrs)).calcMaxIndex()).toStrictEqual(expected);
    });
  });

  describe('calcTotalLength', () => {
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
    ])('%s: %s.calcTotalLength() = %s', (_msg, nrs, expected) => {
      expect(new Strips(createStrips(nrs)).calcTotalLength()).toStrictEqual(expected);
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
      expect(Strips.fromPOJO(input).compact().toPOJO()).toStrictEqual(expected);
    });
  });

  it('toPOJO maps each value toPOJO', () => {
    const strip1 = mock<Strip>({
      toPOJO: mockFn(),
    });
    strip1.toPOJO.mockReturnValueOnce('first');
    const strip2 = mock<Strip>({
      toPOJO: mockFn(),
    });
    strip2.toPOJO.mockReturnValueOnce('second');
    const strips = Strips.from(strip1, strip2);
    expect(strips.toPOJO()).toStrictEqual(['first', 'second']);
  });
});
