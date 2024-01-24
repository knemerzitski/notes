import { describe, expect, it } from 'vitest';

import IndexStrip from './IndexStrip';
import RangeStrip from './RangeStrip';
import Strips from './Strips';

describe('IndexStrip', () => {
  it('maxIndex is equal to index', () => {
    expect(new IndexStrip(8).maxIndex).toStrictEqual(8);
  });

  it('returns length 1', () => {
    expect(new IndexStrip(5).length).toStrictEqual(1);
  });

  describe('reference', () => {
    it.each([
      [3, ['abcdef'], ['d']],
      [2, ['ab', 'cd'], ['c']],
    ])('%s.reference(%s) = %s', (index, stripsArr, expected) => {
      expect(new IndexStrip(index).reference(Strips.fromPOJO(stripsArr))).toStrictEqual(
        Strips.fromPOJO(expected)
      );
    });
  });

  it('returns self on slice', () => {
    expect(new IndexStrip(5).slice()).toStrictEqual(new IndexStrip(5));
  });

  describe('concat', () => {
    it('concats two adjacent increasing numbers', () => {
      expect(new IndexStrip(3).concat(new IndexStrip(4))).toStrictEqual(
        Strips.from(new RangeStrip(3, 4))
      );
    });

    it('keeps reverse order numbers separate', () => {
      expect(new IndexStrip(4).concat(new IndexStrip(3))).toStrictEqual(
        Strips.from(new IndexStrip(4), new IndexStrip(3))
      );
    });

    it('keeps numbers with gap separate', () => {
      expect(new IndexStrip(4).concat(new IndexStrip(6))).toStrictEqual(
        Strips.from(new IndexStrip(4), new IndexStrip(6))
      );
    });

    it('concats left adjancent index and range', () => {
      expect(new IndexStrip(4).concat(new RangeStrip(5, 6))).toStrictEqual(
        Strips.from(new RangeStrip(4, 6))
      );
    });

    it('keeps index and range with gap separate', () => {
      expect(new IndexStrip(4).concat(new RangeStrip(6, 8))).toStrictEqual(
        Strips.from(new IndexStrip(4), new RangeStrip(6, 8))
      );
    });

    it('keeps index next to endIndex in range separate', () => {
      expect(new IndexStrip(9).concat(new RangeStrip(6, 8))).toStrictEqual(
        Strips.from(new IndexStrip(9), new RangeStrip(6, 8))
      );
    });
  });

  it('serializes to number', () => {
    expect(new IndexStrip(2).toPOJO()).toStrictEqual(2);
  });
});
