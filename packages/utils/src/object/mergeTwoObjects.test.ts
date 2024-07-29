import { it, expect } from 'vitest';

import mergeTwoObjects from './mergeTwoObjects';

it.each([
  [undefined, undefined, undefined],
  [{}, undefined, {}],
  [undefined, {}, {}],
  [{ a: 1 }, {}, { a: 1 }],
  [{ a: 1 }, { a: 2 }, { a: 2 }],
  [{ a: 1 }, { b: 1 }, { a: 1, b: 1 }],
  [
    { a: 1, nested: { aa: 1 } },
    { a: 2, nested: { aa: 2, b: 3 } },
    { a: 2, nested: { aa: 2, b: 3 } },
  ],
  [{ a: 1, left: { aa: 1 } }, { a: 2 }, { a: 2, left: { aa: 1 } }],
  [{ a: 1 }, { a: 2, right: { aa: 1 } }, { a: 2, right: { aa: 1 } }],
  [
    [1, 2],
    [3, 4],
    [3, 4],
  ],
  [{ 0: 1, 1: 2 }, [3, 4], { 0: 3, 1: 4 }],
])('(%s,%s) => %s', (a, b, expectedResult) => {
  expect(mergeTwoObjects(a, b)).toStrictEqual(expectedResult);
});
