import { describe, expect, it } from 'vitest';

import { SelectionRange } from './selection-range';

describe('clamp', () => {
  const length = 20;
  it.each([
    [0, 0, 0, 0],
    [-1, 0, 0, 0],
    [-10, -20, 20, 20],
    [0, -1, 0, 20],
    [-1, 8, 8, 8],
    [4, -1, 4, 20],
    [16, 4, 4, 4],
    [5, 25, 5, 20],
    [25, 25, 20, 20],
  ])('(%s,%s) => (%s,%s)', (start, end, expectedStart, expectedEnd) => {
    expect(SelectionRange.clamp(SelectionRange.from(start, end), length)).toEqual({
      start: expectedStart,
      end: expectedEnd,
    });
  });
});
