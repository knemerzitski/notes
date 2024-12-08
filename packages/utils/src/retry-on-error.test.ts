import { describe, expect, it } from 'vitest';

import { retryAlwaysCond, retryTimesCond, wrapRetryOnError } from './retry-on-error';

describe('wrapRetryOnErrorAsync', () => {
  it('has hardcoded limit to prevent infinite error loop', async () => {
    let callCount = 0;

    const fn = wrapRetryOnError(() => {
      callCount++;
      throw new Error();
    }, retryAlwaysCond);

    await expect(fn()).rejects.toThrow();
    expect(callCount).toBeGreaterThan(1);
  });

  it('retries 3 times', async () => {
    let callCount = 0;

    const fn = wrapRetryOnError(() => {
      callCount++;
      throw new Error();
    }, retryTimesCond(3));

    await expect(fn()).rejects.toThrow();
    expect(callCount).toStrictEqual(4);
  });
});
