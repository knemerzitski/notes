import { expect, it } from 'vitest';
import objectValueArrayPermutations from './objectValueArrayPermutations';

function collectByCopy<T>(gen: Generator<Readonly<T>>): T[] {
  const values: T[] = [];
  for (const value of gen) {
    values.push({ ...value });
  }
  return values;
}

it.each([
  [undefined, []],
  [
    {
      a: [],
    },
    [],
  ],
  [
    {
      a: [],
      b: [],
    },
    [],
  ],
  [
    {
      a: [1],
      b: [2],
    },
    [
      {
        a: 1,
        b: 2,
      },
    ],
  ],
  [
    {
      a: [1, 2],
      b: [3, 4, 5],
    },
    [
      {
        a: 2,
        b: 5,
      },
      {
        a: 2,
        b: 4,
      },
      {
        a: 2,
        b: 3,
      },
      {
        a: 1,
        b: 5,
      },
      {
        a: 1,
        b: 4,
      },
      {
        a: 1,
        b: 3,
      },
    ],
  ],
])('%s => %s', (obj, expected) => {
  expect(collectByCopy(objectValueArrayPermutations(obj))).toStrictEqual(expected);
});
