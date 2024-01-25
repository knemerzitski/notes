import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { StringStrip } from './string-strip';
import Strip, { EMPTY } from './strip';
import { Strips } from './strips';

describe('StringStrip', () => {
  it('sets value from constructor', () => {
    expect(new StringStrip('').value).toStrictEqual('');
    expect(new StringStrip('abcde').value).toStrictEqual('abcde');
    expect(new StringStrip('abcdef').value).toStrictEqual('abcdef');
  });

  it('returns string length', () => {
    expect(new StringStrip('').length).toStrictEqual(0);
    expect(new StringStrip('abcde').length).toStrictEqual(5);
    expect(new StringStrip('abcdefg').length).toStrictEqual(7);
  });

  it('has maxIndex -1', () => {
    expect(new StringStrip('').maxIndex).toStrictEqual(-1);
  });

  it('returns this for reference', () => {
    expect(new StringStrip('abcde').reference()).toStrictEqual(
      Strips.from(new StringStrip('abcde'))
    );
  });

  it('slices string', () => {
    expect(new StringStrip('hello world').slice(6, -1)).toStrictEqual(
      new StringStrip('worl')
    );
  });

  describe('concat', () => {
    it('concats strings together: "hello" + " world" = "hello world"', () => {
      expect(new StringStrip('hello').concat(new StringStrip(' world'))).toStrictEqual(
        Strips.from(new StringStrip('hello world'))
      );
    });

    it('keeps generic strip separate: "msg" + unknown = ["msg", unknown]', () => {
      const leftStrip = new StringStrip('msg');
      const rightStrip = mock<Strip>();

      expect(leftStrip.concat(rightStrip)).toStrictEqual(
        Strips.from(leftStrip, rightStrip)
      );
    });
  });

  it('returns EMPTY on intersect', () => {
    expect(new StringStrip('abc').intersect()).toStrictEqual(EMPTY);
  });
});
