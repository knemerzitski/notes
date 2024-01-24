import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import IndexStrip from './IndexStrip';
import RangeStrip from './RangeStrip';
import StringStrip from './StringStrip';
import Strip from './Strip';
import Strips from './Strips';

describe('Strip', () => {
  describe('static', () => {
    describe('deserialize', () => {
      it('string => StringStrip', () => {
        expect(Strip.deserialize('a')).toStrictEqual(new StringStrip('a'));
      });

      it('number => IndexStrip', () => {
        expect(Strip.deserialize(5)).toStrictEqual(new IndexStrip(5));
      });

      it('[number,number] => RangeStrip', () => {
        expect(Strip.deserialize([1, 2])).toStrictEqual(new RangeStrip(1, 2));
      });

      it('throws error on invalid value', () => {
        expect(() => Strip.deserialize(true)).toThrow();
        expect(() => Strip.deserialize({})).toThrow();
      });
    });

    describe('EMPTY', () => {
      it('has length 0', () => {
        expect(Strip.EMPTY.length).toStrictEqual(0);
      });

      it('has maxIndex -1', () => {
        expect(Strip.EMPTY.maxIndex).toStrictEqual(-1);
      });

      it('returns empty reference', () => {
        expect(Strip.EMPTY.reference(mock())).toStrictEqual(Strips.EMPTY);
      });

      it('return self on slice', () => {
        expect(Strip.EMPTY.slice()).toStrictEqual(Strip.EMPTY);
      });

      it('returns provided strip on concat', () => {
        expect(Strip.EMPTY.concat(Strip.deserialize('hi'))).toStrictEqual(
          Strips.deserialize('hi')
        );
      });

      it('returns undefined on serialize', () => {
        expect(Strip.EMPTY.serialize()).toBeUndefined();
      });
    });
  });
});
