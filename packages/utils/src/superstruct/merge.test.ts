import { number, object, string } from 'superstruct';
import { expect, it } from 'vitest';
import { merge } from './merge';

it('merges struct with given struct', () => {
  const A = object({
    a: string(),
    b: number(),
  });

  const B = object({
    b: string(),
  });

  const C = merge(A, B);

  expect(
    C.is({
      a: 'a',
      b: 'b',
    })
  ).toBeTruthy();
});
