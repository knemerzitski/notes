import { expect, it } from 'vitest';

import { zip } from './zip';

it.each([
  [[[]], []],

  [[[1, 2]], [[1], [2]]],
  [[[1], ['a']], [[1, 'a']]],
  [
    [
      [1, 2],
      ['a', 'b'],
    ],
    [
      [1, 'a'],
      [2, 'b'],
    ],
  ],
  [
    [
      [1, 2],
      ['a', 'b'],
      ['A', 'B'],
    ],
    [
      [1, 'a', 'A'],
      [2, 'b', 'B'],
    ],
  ],
])('%s', (arrs, expected) => {
  expect([...zip(...arrs)]).toStrictEqual(expected);
});

it('throws error if array lengths are different', () => {
  expect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    [...zip([1], [1, 2])];
  }).toThrow();
});
