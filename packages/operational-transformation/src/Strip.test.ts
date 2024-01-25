import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import Strip from './Strip';
import Strips from './Strips';

describe('Strip', () => {
  describe('static', () => {
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
        const strip = mock<Strip>();
        expect(Strip.EMPTY.concat(strip)).toStrictEqual(new Strips([strip]));
      });
    });
  });
});
