import { it, expect } from 'vitest';

import groupBy from './groupBy';

interface Item {
  value: string;
  meta?: number;
}

it.each<[Item[], Record<string, Item[]>]>([
  [[], {}],
  [
    [{ value: 'a' }],
    {
      a: [
        {
          value: 'a',
        },
      ],
    },
  ],
  [
    [{ value: 'a' }, { value: 'b' }],
    {
      a: [
        {
          value: 'a',
        },
      ],
      b: [
        {
          value: 'b',
        },
      ],
    },
  ],
  [
    [{ value: 'a', meta: 0 }, { value: 'b' }, { value: 'a', meta: 1 }],
    {
      a: [
        {
          value: 'a',
          meta: 0,
        },
        {
          value: 'a',
          meta: 1,
        },
      ],
      b: [
        {
          value: 'b',
        },
      ],
    },
  ],
])('%s => %s', (arr, expected) => {
  expect(groupBy(arr, (item) => item.value)).toStrictEqual(expected);
});
