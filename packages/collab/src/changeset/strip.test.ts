import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Strip } from './strip';
import { Strips } from './strips';

describe('EMPTY', () => {
  it('has length 0', () => {
    expect(Strip.EMPTY.length).toStrictEqual(0);
  });

  it('reference returns empty strips', () => {
    expect(Strip.EMPTY.reference()).toStrictEqual(Strips.EMPTY);
  });

  it('slice returns self', () => {
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

  it('serializes to null', () => {
    expect(Strip.EMPTY.serialize()).toBeNull();
  });

  it('deserialize returns self on null or undefined', () => {
    expect(Strip.EMPTY.parseValue(null)).toStrictEqual(Strip.EMPTY);
    expect(Strip.EMPTY.parseValue(undefined)).toStrictEqual(Strip.EMPTY);
  });
});
