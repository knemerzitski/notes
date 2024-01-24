import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import IndexStrip from './IndexStrip';
import RangeStrip from './RangeStrip';
import StringStrip from './StringStrip';
import Strip from './Strip';
import Strips from './Strips';

describe('Strip', () => {
  describe('static', () => {
    describe('fromPOJO', () => {
      it('string => StringStrip', () => {
        expect(Strip.fromPOJO('a')).toStrictEqual(new StringStrip('a'));
      });

      it('number => IndexStrip', () => {
        expect(Strip.fromPOJO(5)).toStrictEqual(new IndexStrip(5));
      });

      it('[number,number] => RangeStrip', () => {
        expect(Strip.fromPOJO([1, 2])).toStrictEqual(new RangeStrip(1, 2));
      });

      it('null => EMPTY', () => {
        expect(Strip.fromPOJO(null)).toStrictEqual(Strip.EMPTY);
      });

      it('undefined => EMPTY', () => {
        expect(Strip.fromPOJO(undefined)).toStrictEqual(Strip.EMPTY);
      });

      it('throws error on invalid value', () => {
        expect(() => Strip.fromPOJO(true)).toThrow();
        expect(() => Strip.fromPOJO({})).toThrow();
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
        expect(Strip.EMPTY.concat(Strip.fromPOJO('hi'))).toStrictEqual(
          Strips.fromPOJO(['hi'])
        );
      });

      it('returns undefined on toPOJO', () => {
        expect(Strip.EMPTY.toPOJO()).toBeUndefined();
      });
    });
  });
});
