import { assert, describe, expect, it } from 'vitest';

import midString from './midString';

describe('midString', () => {
  it('returns n for empty strings', () => {
    expect(midString('', '')).toStrictEqual('n');
  });

  it.each([
    ['abcde', 'abchi', 'abcf'],
    ['abc', 'abchi', 'abcd'],
    ['abhs', 'abit', 'abhw'],
    ['abh', 'abit', 'abhn'],
    ['abhz', 'abit', 'abhzn'],
    ['abhzs', 'abit', 'abhzw'],
    ['abhzz', 'abit', 'abhzzn'],
    ['abc', 'abcah', 'abcad'],
    ['abc', 'abcab', 'abcaan'],
    ['abc', 'abcaah', 'abcaad'],
    ['abc', 'abcb', 'abcan'],
  ])('returns "%s" as middle between "%s" and "%s"', (prev, next, expected) => {
    assert(
      prev < expected && expected < next,
      `Invalid input "${prev}", "${next}", "${expected}"`
    );
    expect(midString(prev, next)).toStrictEqual(expected);
  });
});
