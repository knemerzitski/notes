import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import StringStrip from './StringStrip';
import Strip from './Strip';
import Strips from './Strips';

describe('StringStrip', () => {
  it('has maxIndex -1', () => {
    expect(new StringStrip('').maxIndex).toStrictEqual(-1);
  });

  it('sets value from constructor', () => {
    expect(new StringStrip('abcde').value).toStrictEqual('abcde');
  });

  it('returns string length', () => {
    expect(new StringStrip('abcde').length).toStrictEqual(5);
  });

  it('returns this for reference', () => {
    expect(new StringStrip('abcde').reference()).toStrictEqual(
      new Strips(new StringStrip('abcde'))
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
        new Strips(new StringStrip('hello world'))
      );
    });

    it('concats separate: "msg" + unknown = ["msg", unknown]', () => {
      const leftStrip = new StringStrip('msg');
      const rightStrip = mock<Strip>();

      expect(leftStrip.concat(rightStrip)).toStrictEqual(
        new Strips(leftStrip, rightStrip)
      );
    });
  });

  it('serializes as string', () => {
    expect(new StringStrip('hello world').toPOJO()).toStrictEqual('hello world');
  });
});
