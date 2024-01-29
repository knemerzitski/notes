import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Strip } from './strip';
import { Strips } from './strips';

describe('strip', () => {
  describe('EMPTY', () => {
    it('has length 0', () => {
      expect(Strip.EMPTY.length).toStrictEqual(0);
    });

    it('reference returns empty strips', () => {
      expect(Strip.EMPTY.reference(mock())).toStrictEqual(Strips.EMPTY);
    });

    it('slice returns slef', () => {
      expect(Strip.EMPTY.slice()).toStrictEqual(Strip.EMPTY);
    });

    it('concat returns provided', () => {
      const strip = mock<Strip>();
      expect(Strip.EMPTY.concat(strip)).toStrictEqual(new Strips([strip]));
    });

    it('is only equal to itself', () => {
      expect(Strip.EMPTY.isEqual(Strip.EMPTY)).toBeTruthy();
      expect(Strip.EMPTY.isEqual(mock<Strip>())).toBeFalsy();
    });

    it('toString returns (EMPTY)', () => {
      expect(Strip.EMPTY.toString()).toStrictEqual('(EMPTY)');
    });
  });
});
