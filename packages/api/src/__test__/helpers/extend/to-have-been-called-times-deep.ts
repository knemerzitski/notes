/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { expect } from 'vitest';

declare module 'vitest' {
  interface Assertion extends CustomMatchers {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

interface CustomMatchers {
  toHaveBeenCalledTimesDeep(times: number): void;
}

interface CalledSpy {
  count: number;
  path: string;
}

function calledSpiesPrettyString(calledSpies: CalledSpy[]): string {
  return calledSpies.map((s) => `\t${s.count}\t${s.path}`).join('\n');
}

function findSpiesWithCalls(obj: any, ctx?: { path: string }): CalledSpy[] {
  const path = ctx?.path ?? '';
  const calls: CalledSpy[] = [];

  if (!obj._isMockObject) {
    return calls;
  }

  if ('mock' in obj && obj.mock.calls.length > 0) {
    calls.push({
      path,
      count: obj.mock.calls.length,
    });
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    calls.push(
      ...findSpiesWithCalls(value, {
        path: [path, key].join('.'),
      })
    );
  }

  return calls;
}

expect.extend({
  toHaveBeenCalledTimesDeep(received, expected) {
    if (!received._isMockObject) {
      return {
        message: () => `${received} is not a mock object`,
        pass: false,
      };
    }

    const spiesWithCalls = findSpiesWithCalls(received);
    const callCount = spiesWithCalls.reduce((sum, calledSpy) => sum + calledSpy.count, 0);

    return {
      message: () =>
        `expected "mock" to be deep called ${expected} times, but got ${callCount} times\n\tCount\tPath\n${calledSpiesPrettyString(spiesWithCalls)}`,
      pass: callCount === expected,
    };
  },
});
