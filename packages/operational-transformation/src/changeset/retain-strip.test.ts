import { describe, expect, it } from 'vitest';

import { RetainStrip } from './retain-strip';
import { deserializeStrip as s, deserializeStrips as ss } from './serialize';
import { Strip } from './strip';
import { Strips } from './strips';

describe('RetainStrip', () => {
  describe('static', () => {
    describe('create', () => {
      it.each([
        [6, 10, [6, 10]],
        [5, 5, 5],
        [0, 1, [0, 1]],
        [3, -1, null],
        [3, -1, undefined],
        [-4, -1, null],
      ])('create(%s%s) = %s', (startIndex, endIndex, expected) => {
        expect(RetainStrip.create(startIndex, endIndex).toString()).toStrictEqual(
          s(expected).toString()
        );
      });
    });
  });

  describe('length', () => {
    it.each([
      [0, 1, 2],
      [4, 9, 6],
    ])('(%s - %s).length = %s', (startIndex, endIndex, expected) => {
      expect(new RetainStrip(startIndex, endIndex).length).toStrictEqual(expected);
    });
  });

  it('throws error if startIndex is less than 0', () => {
    expect(() => new RetainStrip(-1, 4)).toThrow();
  });

  it('throws error if endIndex is less than startIndex', () => {
    expect(() => new RetainStrip(5, 4)).toThrow();
  });

  describe('reference', () => {
    it.each([
      [2, 4, ['abcdefgh'], ['cde']],
      [3, 3, ['abcdefgh'], ['d']],
      [1, undefined, ['abc'], ['b']],
    ])('(%s - %s).reference(%s) = %s', (startIndex, endIndex, strips, expected) => {
      expect(
        new RetainStrip(startIndex, endIndex).reference(ss(strips)).toString()
      ).toStrictEqual(ss(expected).toString());
    });
  });

  describe('slice', () => {
    it.each([
      ['returns all on no args', 2, 8, [undefined, undefined], [2, 8]],
      ['returns from start', 2, 8, [3, undefined], [5, 8]],
      ['returns from middle', 2, 8, [3, 5], [5, 6]],
      ['returns second to last on end -1', 2, 8, [0, -1], [2, 7]],
      ['returns single index', 2, 8, [2, 3], 4],
      ['returns last on start -1', 2, 8, [-1, undefined], 8],
      ['returns empty on out of bounds index', 2, 8, [10, 15], undefined],
      ['returns empty when start == end', 2, 8, [4, 4], undefined],
      ['returns empty when start > end', 2, 8, [4, 2], undefined],
    ])(
      '%s: (%s - %s).slice(%s) = %s',
      (_msg, startIndex, endIndex, [start, end], expected) => {
        expect(
          new RetainStrip(startIndex, endIndex).slice(start, end).toString()
        ).toStrictEqual(s(expected).toString());
      }
    );
  });

  describe('concat', () => {
    it('ignores empty', () => {
      expect(new RetainStrip(3, 6).concat(Strip.EMPTY).toString()).toStrictEqual(
        Strips.from(new RetainStrip(3, 6)).toString()
      );
    });

    it('concats range and adjacent index', () => {
      expect(new RetainStrip(3, 5).concat(new RetainStrip(6)).toString()).toStrictEqual(
        Strips.from(new RetainStrip(3, 6)).toString()
      );
    });

    it('concats two adjacent ranges', () => {
      expect(
        new RetainStrip(3, 5).concat(new RetainStrip(6, 10)).toString()
      ).toStrictEqual(Strips.from(new RetainStrip(3, 10)).toString());
    });

    it('keeps range and index with gap separate', () => {
      expect(new RetainStrip(3, 5).concat(new RetainStrip(7)).toString()).toStrictEqual(
        Strips.from(new RetainStrip(3, 5), new RetainStrip(7)).toString()
      );
    });

    it('keeps two ranges with gap separate', () => {
      expect(
        new RetainStrip(3, 5).concat(new RetainStrip(7, 10)).toString()
      ).toStrictEqual(
        Strips.from(new RetainStrip(3, 5), new RetainStrip(7, 10)).toString()
      );
    });

    it('keeps two ranges overlapping separate', () => {
      expect(
        new RetainStrip(3, 6).concat(new RetainStrip(4, 6)).toString()
      ).toStrictEqual(
        Strips.from(new RetainStrip(3, 6), new RetainStrip(4, 6)).toString()
      );
    });
  });

  describe('isEqual', () => {
    it('returns true for value', () => {
      expect(s('abc').isEqual(s('abc'))).toBeTruthy();
      expect(s('dds').isEqual(s('dds'))).toBeTruthy();
    });

    it('returns false for different values', () => {
      expect(s('aaa').isEqual(s('bbc'))).toBeFalsy();
      expect(s('xy').isEqual(s('zzzs'))).toBeFalsy();
    });
  });

  describe('toString', () => {
    it('returns single number for retain with length of 1', () => {
      expect(new RetainStrip(5, 5).toString()).toStrictEqual('5');
      expect(new RetainStrip(8).toString()).toStrictEqual('8');
      expect(new RetainStrip(16, 16).toString()).toStrictEqual('16');
    });

    it('returns range with spaced dash between', () => {
      expect(new RetainStrip(5, 8).toString()).toStrictEqual('5 - 8');
      expect(new RetainStrip(13, 18).toString()).toStrictEqual('13 - 18');
    });
  });
});
