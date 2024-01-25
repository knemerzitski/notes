import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import Strip, { EMPTY, StripType } from './strip';
import { Strips } from './strips';

describe('strip', () => {
  describe('EMPTY', () => {
    it('has length 0', () => {
      expect(EMPTY.length).toStrictEqual(0);
    });

    it('has maxIndex -1', () => {
      expect(EMPTY.maxIndex).toStrictEqual(-1);
    });

    it('type is empty', () => {
      expect(EMPTY.type).toStrictEqual(StripType.Empty);
    });

    it('returns empty reference', () => {
      expect(EMPTY.reference(mock())).toStrictEqual(Strips.EMPTY);
    });

    it('return self on slice', () => {
      expect(EMPTY.slice()).toStrictEqual(EMPTY);
    });

    it('returns provided strip on concat', () => {
      const strip = mock<Strip>();
      expect(EMPTY.concat(strip)).toStrictEqual(new Strips([strip]));
    });

    it('return self on intersect', () => {
      expect(EMPTY.intersect(EMPTY)).toStrictEqual(EMPTY);
      expect(EMPTY.intersect(mock<Strip>())).toStrictEqual(EMPTY);
    });
  });
});
