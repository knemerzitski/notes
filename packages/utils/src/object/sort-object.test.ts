import { describe, expect, it } from 'vitest';

import { sortObject } from './sort-object';

it.each([
  [
    { b: 'foo', a: 'bar' },
    { a: 'bar', b: 'foo' },
  ],
  [
    { b: 'foo', c: { b: 'foo', a: 'bar' }, a: 'bar' },
    { a: 'bar', b: 'foo', c: { a: 'bar', b: 'foo' } },
  ],
])('%s => %s', (input, expected) => {
  expect(sortObject(input)).toStrictEqual(expected);
});

describe('option exclude', () => {
  it.each([
    [
      { b: 'foo', c: undefined, a: 'bar' },
      { a: 'bar', b: 'foo' },
    ],
  ])('%s => %s', (input, expected) => {
    expect(
      sortObject(input, {
        exclude: ({ value }) => value === undefined,
      })
    ).toStrictEqual(expected);
  });
});

describe('option sort', () => {
  it.each([
    [
      {
        sort: { b: 'foo', a: 'bar' },
        nosort: { nosort: 'this wont be sorted', b: 'foo', a: 'bar' },
      },
      {
        sort: { a: 'bar', b: 'foo' },
        nosort: { nosort: 'this wont be sorted', b: 'foo', a: 'bar' },
      },
    ],
  ])('%s => %s', (input, expected) => {
    expect(
      sortObject(input, {
        sort: (obj) => 'nosort' in obj,
      })
    ).toStrictEqual(expected);
  });
});
