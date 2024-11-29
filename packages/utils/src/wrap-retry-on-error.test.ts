import { describe, expect, it } from 'vitest';

import {
  retryAlways,
  retryTimes,
  wrapRetryOnError,
  wrapRetryOnErrorAsync,
} from './wrap-retry-on-error';

describe('wrapRetryOnError', () => {
  it('has hardcoded limit to prevent infinite error loop', () => {
    let callCount = 0;

    const fn = wrapRetryOnError(() => {
      callCount++;
      throw new Error();
    }, retryAlways);

    expect(() => {
      fn();
    }).toThrow();
    expect(callCount).toBeGreaterThan(1);
  });

  it('retries 3 times', () => {
    let callCount = 0;

    const fn = wrapRetryOnError(() => {
      callCount++;
      throw new Error();
    }, retryTimes(3));

    expect(() => {
      fn();
    }).toThrow();
    expect(callCount).toStrictEqual(4);
  });
});

describe('wrapRetryOnErrorAsync', () => {
  it('has hardcoded limit to prevent infinite error loop', async () => {
    let callCount = 0;

    const fn = wrapRetryOnErrorAsync(() => {
      callCount++;
      throw new Error();
    }, retryAlways);

    await expect(fn()).rejects.toThrow();
    expect(callCount).toBeGreaterThan(1);
  });

  it('retries 3 times', async () => {
    let callCount = 0;

    const fn = wrapRetryOnErrorAsync(() => {
      callCount++;
      throw new Error();
    }, retryTimes(3));

    await expect(fn()).rejects.toThrow();
    expect(callCount).toStrictEqual(4);
  });
});
