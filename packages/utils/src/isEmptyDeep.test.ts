import { expect, it } from 'vitest';
import isEmptyDeep from './isEmptyDeep';

it.each([
  [{}, true],
  [null, true],
  [undefined, true],
  ['a', false],
  ['', false],
  [5, false],
  [0, false],
  [[], true],
  [[0], false],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  [() => {}, false],
  [{ a: { b: { c: undefined } } }, true],
  [{ a: { b: { c: [], e: {} } } }, true],
  [{ a: { b: { c: undefined, v: 's' } } }, false],
])('%s => %s', (input, expected) => {
  expect(isEmptyDeep(input)).toStrictEqual(expected);
});
