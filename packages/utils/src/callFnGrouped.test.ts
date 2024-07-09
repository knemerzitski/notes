import { beforeEach, expect, it, vi } from 'vitest';

import callFnGrouped from './callFnGrouped';

interface Input {
  value: number;
  group: string;
}

type Output = string;

/**
 * Multiply value by 2 and append group text
 */
function multipyByTwoAndAppendGroup(inputs: readonly Input[], group: string): Output[] {
  return inputs.map((input) => `${input.value * 2}${group}`);
}

const mockFn = vi.fn(multipyByTwoAndAppendGroup);

beforeEach(() => {
  mockFn.mockClear();
});

it.each<{ inputs: Input[]; expectedOutputs: Output[]; expectedCalls: number }>([
  {
    inputs: [],
    expectedOutputs: [],
    expectedCalls: 0,
  },
  {
    inputs: [{ value: 1, group: 'a' }],
    expectedOutputs: ['2a'],
    expectedCalls: 1,
  },
  {
    inputs: [
      { value: 1, group: 'a' },
      { value: 4, group: 'b' },
      { value: 2, group: 'a' },
      { value: 5, group: 'b' },
      { value: 6, group: 'b' },
    ],
    expectedOutputs: ['2a', '8b', '4a', '10b', '12b'],
    expectedCalls: 2,
  },
  {
    inputs: [
      { value: 10, group: 'c' },
      { value: 1, group: 'a' },
      { value: 4, group: 'b' },
      { value: 2, group: 'a' },
      { value: 5, group: 'b' },
      { value: 6, group: 'b' },
    ],
    expectedOutputs: ['20c', '2a', '8b', '4a', '10b', '12b'],
    expectedCalls: 3,
  },
])('$inputs => $expectedOutputs', async ({ inputs, expectedOutputs, expectedCalls }) => {
  await expect(
    callFnGrouped(inputs, (input) => input.group, mockFn)
  ).resolves.toStrictEqual(expectedOutputs);
  expect(mockFn).toHaveBeenCalledTimes(expectedCalls);
});

it('throws error if output size is different from input', async () => {
  await expect(() =>
    callFnGrouped<[number, number], number, number>(
      [
        [1, 1],
        [2, 1],
        [3, 2],
        [2, 1],
      ],
      (input) => input[1],
      () => {
        return [1];
      }
    )
  ).rejects.toThrow();
});
