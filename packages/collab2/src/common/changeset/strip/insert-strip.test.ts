import { expect, it } from 'vitest';

import { Changeset, InsertStrip, StripsStruct, StripStruct } from '..';

function s(value: string) {
  return StripStruct.create(value);
}

function ss(value: string) {
  return StripsStruct.create(value);
}

it('create', () => {
  expect(InsertStrip.create('').toString()).toStrictEqual(InsertStrip.EMPTY.toString());
  expect(InsertStrip.create('abc').toString()).toStrictEqual(s('"abc"').toString());
  expect(InsertStrip.create('ab"c').toString()).toStrictEqual(s('"ab\\"c"').toString());
});

it('outputLength', () => {
  expect(s('"ab"').outputLength).toStrictEqual(2);
  expect(s('"abc"').outputLength).toStrictEqual(3);
});

it('reference', () => {
  expect(s('"ab"').reference(Changeset.EMPTY).toString()).toStrictEqual(
    ss('"ab"').toString()
  );
});

it('slice', () => {
  expect(s('"hello world"').slice(6, 10).toString()).toStrictEqual(
    s('"worl"').toString()
  );
});

it('concat', () => {
  expect(s('"hello"').concat(InsertStrip.EMPTY).toString()).toStrictEqual(
    ss('"hello"').toString()
  );
  expect(s('"hello"').concat(s('" world"')).toString()).toStrictEqual(
    s('"hello world"').toString()
  );
});

it('isEqual', () => {
  expect(s('"abc"').isEqual(s('"abc"'))).toBeTruthy();
  expect(s('"def"').isEqual(s('"def"'))).toBeTruthy();

  expect(s('"aaa"').isEqual(s('"abb"'))).toBeFalsy();
  expect(s('"www"').isEqual(s('"zzz"'))).toBeFalsy();
});
