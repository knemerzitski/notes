import { describe, expect, it } from 'vitest';

import IndexStrip from './IndexStrip';
import RangeStrip from './RangeStrip';
import Strip from './Strip';
import Strips from './Strips';

describe('RangeStrip', () => {
  describe('length', () => {
    it.each([
      [0, 1, 2],
      [4, 9, 6],
    ])('(%s - %s).length = %s', (startIndex, endIndex, expected) => {
      expect(new RangeStrip(startIndex, endIndex).length).toStrictEqual(expected);
    });
  });

  it('throws error if endIndex is equal to startIndex', () => {
    expect(() => new RangeStrip(5, 5)).toThrow();
  });

  describe('maxIndex', () => {
    it.each([
      [0, 1, 1],
      [4, 9, 9],
    ])('(%s - %s).maxIndex = %s', (startIndex, endIndex, expected) => {
      expect(new RangeStrip(startIndex, endIndex).maxIndex).toStrictEqual(expected);
    });
  });

  describe('reference', () => {
    it.each([[2, 4, ['abcdefgh'], ['cde']]])(
      '(%s - %s).reference(%s) = %s',
      (startIndex, endIndex, strips, expected) => {
        expect(
          new RangeStrip(startIndex, endIndex).reference(Strips.fromPOJO(strips))
        ).toStrictEqual(Strips.fromPOJO(expected));
      }
    );
  });

  describe('slice', () => {
    it.each([
      ['returns all on no args', 2, 8, [undefined, undefined], [2, 8]],
      ['returns from start', 2, 8, [3, undefined], [5, 8]],
      ['returns from middle', 2, 8, [3, 5], [5, 6]],
      ['returns second to last on end -1', 2, 8, [0, -1], [2, 7]],
      ['returns IndexStrip with result length 1', 2, 8, [2, 3], 4],
      ['returns last on start -1', 2, 8, [-1, undefined], 8],
      ['returns empty on out of bounds index', 2, 8, [10, 15], undefined],
    ])(
      '%s: (%s - %s).slice(%s) = %s',
      (_msg, startIndex, endIndex, [start, end], expected) => {
        expect(new RangeStrip(startIndex, endIndex).slice(start, end)).toStrictEqual(
          Strip.fromPOJO(expected)
        );
      }
    );
  });

  describe('concat', () => {
    it('concats range and adjacent index', () => {
      expect(new RangeStrip(3, 5).concat(new IndexStrip(6))).toStrictEqual(
        Strips.from(new RangeStrip(3, 6))
      );
    });

    it('concats two adjacent ranges', () => {
      expect(new RangeStrip(3, 5).concat(new RangeStrip(6, 10))).toStrictEqual(
        Strips.from(new RangeStrip(3, 10))
      );
    });

    it('keeps range and index with gap separate', () => {
      expect(new RangeStrip(3, 5).concat(new IndexStrip(7))).toStrictEqual(
        Strips.from(new RangeStrip(3, 5), new IndexStrip(7))
      );
    });

    it('keeps two ranges with gap separate', () => {
      expect(new RangeStrip(3, 5).concat(new RangeStrip(7, 10))).toStrictEqual(
        Strips.from(new RangeStrip(3, 5), new RangeStrip(7, 10))
      );
    });

    it('keeps two ranges overlapping separate', () => {
      expect(new RangeStrip(3, 6).concat(new RangeStrip(4, 6))).toStrictEqual(
        Strips.from(new RangeStrip(3, 6), new RangeStrip(4, 6))
      );
    });
  });

  it('serializes to array [number,number]', () => {
    expect(new RangeStrip(4, 6).toPOJO()).toStrictEqual([4, 6]);
  });
});
