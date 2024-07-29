import { it, expect } from 'vitest';

import stringPathToNestedObject from './stringPathToNestedObject';

it.each([
  ['', 1, undefined],
  [
    'a',
    1,
    {
      a: 1,
    },
  ],
  [
    'a.b',
    2,
    {
      a: {
        b: 2,
      },
    },
  ],
  [
    'a.b.c',
    3,
    {
      a: {
        b: {
          c: 3,
        },
      },
    },
  ],
])('(%s,%s) => %s', (path, value, expectedResult) => {
  expect(stringPathToNestedObject(path, value)).toStrictEqual(expectedResult);
});
