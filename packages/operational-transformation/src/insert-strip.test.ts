import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { InsertStrip } from './insert-strip';
import { Strip } from './strip';
import { Strips } from './strips';
import { toStrip } from './tests/helpers/convert';

describe('StringStrip', () => {
  it('sets value from constructor', () => {
    expect(new InsertStrip('').value).toStrictEqual('');
    expect(new InsertStrip('abcde').value).toStrictEqual('abcde');
    expect(new InsertStrip('abcdef').value).toStrictEqual('abcdef');
  });

  it('returns string length', () => {
    expect(new InsertStrip('').length).toStrictEqual(0);
    expect(new InsertStrip('abcde').length).toStrictEqual(5);
    expect(new InsertStrip('abcdefg').length).toStrictEqual(7);
  });

  it('returns this for reference', () => {
    expect(new InsertStrip('abcde').reference()).toStrictEqual(
      Strips.from(new InsertStrip('abcde'))
    );
  });

  it('slices string', () => {
    expect(new InsertStrip('hello world').slice(6, -1)).toStrictEqual(
      new InsertStrip('worl')
    );
  });

  describe('concat', () => {
    it('concats strings together: "hello" + " world" = "hello world"', () => {
      expect(new InsertStrip('hello').concat(new InsertStrip(' world'))).toStrictEqual(
        Strips.from(new InsertStrip('hello world'))
      );
    });

    it('keeps generic strip separate: "msg" + unknown = ["msg", unknown]', () => {
      const leftStrip = new InsertStrip('msg');
      const rightStrip = mock<Strip>();

      expect(leftStrip.concat(rightStrip)).toStrictEqual(
        Strips.from(leftStrip, rightStrip)
      );
    });
  });

  describe('isEqual', () => {
    it('returns true for same range', () => {
      expect(toStrip([2, 4]).isEqual(toStrip([2, 4]))).toBeTruthy();
      expect(toStrip([5, 8]).isEqual(toStrip([5, 8]))).toBeTruthy();
    });

    it('returns false for different start index', () => {
      expect(toStrip([2, 4]).isEqual(toStrip([3, 4]))).toBeFalsy();
      expect(toStrip([5, 8]).isEqual(toStrip([6, 8]))).toBeFalsy();
    });

    it('returns false for different end index', () => {
      expect(toStrip([2, 4]).isEqual(toStrip([2, 10]))).toBeFalsy();
      expect(toStrip([5, 8]).isEqual(toStrip([5, 12]))).toBeFalsy();
    });
  });
});
