import { maybeCallFn } from './maybe-call-fn';
import { MaybeValue } from './types';

export type RetryOnErrorFn = (error: unknown) => boolean;

export const HARDCODED_MAX_RETRIES = 20;

export function wrapRetryOnError<T extends unknown[], U>(
  fn: (...args: T) => U,
  retryOnError: RetryOnErrorFn
): (...args: T) => U {
  return (...args) => {
    let retriesRemaining = HARDCODED_MAX_RETRIES;
    do {
      try {
        return fn(...args);
      } catch (err) {
        if (retriesRemaining <= 0) {
          throw err;
        }

        if (retryOnError(err)) {
          retriesRemaining--;
          continue;
        }

        throw err;
      }
      // eslint-disable-next-line no-constant-condition, @typescript-eslint/no-unnecessary-condition
    } while (true);
  };
}

export function wrapRetryOnErrorAsync<T extends unknown[], U>(
  fn: (...args: T) => MaybeValue<U>,
  retryOnError: RetryOnErrorFn
): (...args: T) => MaybeValue<U> {
  return async (...args) => {
    let retriesRemaining = HARDCODED_MAX_RETRIES;
    do {
      try {
        return await maybeCallFn(await fn(...args));
      } catch (err) {
        if (retriesRemaining <= 0) {
          throw err;
        }

        if (retryOnError(err)) {
          retriesRemaining--;
          continue;
        }

        throw err;
      }
      // eslint-disable-next-line no-constant-condition, @typescript-eslint/no-unnecessary-condition
    } while (true);
  };
}

export function retryTimes(maxRetries: number): RetryOnErrorFn {
  let retriesRemaining = maxRetries;
  return () => {
    if (retriesRemaining <= 0) return false;
    retriesRemaining--;

    return true;
  };
}

export const retryAlways: RetryOnErrorFn = () => true;
