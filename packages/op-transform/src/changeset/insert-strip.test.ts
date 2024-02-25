import { assert, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { InsertStrip } from './insert-strip';
import { RetainStrip } from './retain-strip';
import { Strip } from './strip';
import { Strips } from './strips';

describe('InsertStrip', () => {
  describe('static', () => {
    describe('create', () => {
      it.each([
        ['abc', 'abc'],
        ['', null],
        ['', undefined],
      ])('create(%s%s) = %s', (value, expected) => {
        expect(InsertStrip.create(value).toString()).toStrictEqual(
          Strip.deserialize(expected).toString()
        );
      });
    });
  });

  it('sets value from constructor', () => {
    expect(new InsertStrip('abcde').value).toStrictEqual('abcde');
    expect(new InsertStrip('abcdef').value).toStrictEqual('abcdef');
  });

  it('throws error when creating with empty value', () => {
    expect(() => new InsertStrip('')).toThrow();
  });

  it('returns string length', () => {
    expect(new InsertStrip('a').length).toStrictEqual(1);
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
    it('ignores empty', () => {
      expect(new InsertStrip('hello').concat(Strip.EMPTY)).toStrictEqual(
        Strips.from(new InsertStrip('hello'))
      );
    });

    it('concats strings together: "hello" + " world" = "hello world"', () => {
      expect(new InsertStrip('hello').concat(new InsertStrip(' world'))).toStrictEqual(
        Strips.from(new InsertStrip('hello world'))
      );
    });

    it('keeps non-insert strip separate: "msg" + unknown = ["msg", unknown]', () => {
      const leftStrip = new InsertStrip('msg');
      const rightStrip = mock<Strip>();

      expect(leftStrip.concat(rightStrip)).toStrictEqual(
        Strips.from(leftStrip, rightStrip)
      );
    });
  });

  describe('toRetain', () => {
    it('retained strip length stays same', () => {
      expect(new InsertStrip('hello').retain().length).toStrictEqual(5);
      expect(new InsertStrip('hellobb').retain().length).toStrictEqual(7);
    });

    it('adds offset', () => {
      const strip = new InsertStrip('hello').retain(3);
      assert(strip instanceof RetainStrip);
      expect(strip.length).toStrictEqual(5);
      expect(strip.startIndex).toStrictEqual(3);
      expect(strip.endIndex).toStrictEqual(7);
    });
  });

  describe('isEqual', () => {
    it('returns true for strip with same value', () => {
      expect(new InsertStrip('abc').isEqual(new InsertStrip('abc'))).toBeTruthy();
      expect(new InsertStrip('def').isEqual(new InsertStrip('def'))).toBeTruthy();
    });

    it('returns false for strips with different value', () => {
      expect(new InsertStrip('aaa').isEqual(new InsertStrip('abb'))).toBeFalsy();
      expect(new InsertStrip('www').isEqual(new InsertStrip('zzz'))).toBeFalsy();
    });
  });

  describe('toString', () => {
    it.each(['one', 'third'])('wraps qoutes "%s"', (value) => {
      expect(new InsertStrip(value).toString()).toStrictEqual(`"${value}"`);
    });
  });

  describe('serialization', () => {
    it.each([
      ['abc', new InsertStrip('abc')],
      ['abcd', new InsertStrip('abcd')],
    ])('%s', (serialized, strip) => {
      expect(InsertStrip.deserialize(serialized)).toStrictEqual(strip);
      expect(strip.serialize()).toStrictEqual(serialized);
    });
  });
});
