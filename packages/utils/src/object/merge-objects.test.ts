/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { it, expect } from 'vitest';

import { mergeObjects } from './merge-objects';

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
  expect(mergeObjects(a, b)).toStrictEqual(expectedResult);
});

it('same object is not traversed and not copied', () => {
  let spyCounter = 0;
  const spyObj = new Proxy(
    {
      r: 4,
      g: 2,
    },
    {
      get(...args) {
        spyCounter++;
        return Reflect.get(...args);
      },
    }
  );

  const common = {
    a: {
      d: 4,
    },
    spyObj,
    b: 2,
  };

  const obj = {
    value: 's',
    here: {
      deep: common,
    },
  };

  const otherObj = {
    here: {
      deep: common,
    },
    hello: 'text',
  };

  const mergedObj = mergeObjects(obj, otherObj) as any;

  expect(mergedObj.here.deep).toBe(common);
  expect(spyCounter).toStrictEqual(0);
});
