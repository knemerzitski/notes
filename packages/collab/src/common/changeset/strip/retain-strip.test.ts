import { expect, it } from 'vitest';

import { RetainStrip, StripsStruct, StripStruct } from '..';
import { parse as cs } from '../utils/parse';

function s(value: string) {
  return StripStruct.create(value);
}

function ss(value: string) {
  return StripsStruct.create(value);
}

it('create', () => {
  expect(RetainStrip.create(6, 11).toString()).toStrictEqual(s('6-10').toString());
  expect(RetainStrip.create(5, 6).toString()).toStrictEqual(s('5').toString());
  expect(RetainStrip.create(5, 5).toString()).toStrictEqual(RetainStrip.EMPTY.toString());
  expect(RetainStrip.create(0, 1).toString()).toStrictEqual(s('0').toString());
  expect(RetainStrip.create(0, 2).toString()).toStrictEqual(s('0-1').toString());
  expect(RetainStrip.create(3, -1).toString()).toStrictEqual(
    RetainStrip.EMPTY.toString()
  );
  expect(RetainStrip.create(-4, -1).toString()).toStrictEqual(
    RetainStrip.EMPTY.toString()
  );
});

it('outputLength', () => {
  expect(s('6-10').outputLength).toStrictEqual(5);
  expect(s('6').outputLength).toStrictEqual(1);
});

it('reference', () => {
  expect(s('2-4').reference(cs('0:"abcdefgh"'))).toStrictEqual(ss('"cde"'));
  expect(s('3').reference(cs('0:"abcdefgh"'))).toStrictEqual(ss('"d"'));
});

it('slice', () => {
  expect(s('2-8').slice(3, 5).toString()).toStrictEqual(ss('5-6').toString());
  expect(s('2-8').slice(2, 3).toString()).toStrictEqual(ss('4').toString());
  expect(s('2-8').slice(10, 15).toString()).toStrictEqual(RetainStrip.EMPTY.toString());
  expect(s('2-8').slice(4, 4).toString()).toStrictEqual(RetainStrip.EMPTY.toString());
  expect(s('2-8').slice(4, 2).toString()).toStrictEqual(RetainStrip.EMPTY.toString());
  expect(s('2-8').slice(6, 7).toString()).toStrictEqual(ss('8').toString());
  expect(s('2-8').slice(7, 8).toString()).toStrictEqual(RetainStrip.EMPTY.toString());
  expect(s('2-8').slice(5, 7).toString()).toStrictEqual(ss('7-8').toString());
  expect(s('2-8').slice(5, 8).toString()).toStrictEqual(ss('7-8').toString());
});

it('concat', () => {
  expect(s('3-5').concat(RetainStrip.EMPTY).toString()).toStrictEqual(
    ss('3-5').toString()
  );
  expect(s('3-5').concat(s('6')).toString()).toStrictEqual(ss('3-6').toString());
  expect(s('3-5').concat(s('6-10')).toString()).toStrictEqual(s('3-10').toString());
  expect(s('3-5').concat(s('7')).toString()).toStrictEqual(ss('3-5,7').toString());
  expect(s('3-5').concat(s('7-11')).toString()).toStrictEqual(ss('3-5,7-11').toString());
  expect(s('3-5').concat(s('4-7')).toString()).toStrictEqual(ss('3-5,4-7').toString());
});

it('isEqual', () => {
  expect(s('2-3').isEqual(s('2-3'))).toBeTruthy();
  expect(s('5').isEqual(s('5'))).toBeTruthy();

  expect(s('2-3').isEqual(s('2-4'))).toBeFalsy();
  expect(s('2-3').isEqual(s('1-3'))).toBeFalsy();
});
