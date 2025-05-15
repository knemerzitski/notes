import { expect, it } from 'vitest';
import { stringSeparator } from './string-separator';

it('separates without quotes strings', () => {
  expect(stringSeparator('foo,bar,cc')).toStrictEqual(['foo', 'bar', 'cc']);
});

it('separates string with escaped', () => {
  expect(stringSeparator('abc,"foo\\"bar",12')).toStrictEqual([
    'abc',
    '"foo\\"bar"',
    '12',
  ]);
});

it('separates string with separator inside', () => {
  expect(stringSeparator('abc,"foo,bar",12')).toStrictEqual(['abc', '"foo,bar"', '12']);
});

it('separates string with escaped and separator inside', () => {
  expect(stringSeparator('abc,"foo,or\\"bar",12')).toStrictEqual([
    'abc',
    '"foo,or\\"bar"',
    '12',
  ]);
});

it('extracts JSON.stringify string', () => {
  const obj = {
    foo: 'hi',
    bar: '"str"',
  };

  const objStr = JSON.stringify(JSON.stringify(obj));

  expect(stringSeparator('foo,' + objStr + ',bar')).toStrictEqual(['foo', objStr, 'bar']);
});
