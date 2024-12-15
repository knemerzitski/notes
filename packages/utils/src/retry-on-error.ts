import { maybeCallFn } from './maybe-call-fn';
import { MaybePromise, MaybeValue } from './types';

export type RetryErrorCondFn = (error: unknown) => boolean;

export interface RetryOnErrorOptions {
  /**
   * @default 20
   */
  maxAttempts?: number;
  /**
   * -1 to skip setTimeout and retry immediately
   * @default 1000 millis
   */
  retryDelay?: number;
  /**
   * Return `true` to retry invoking the function
   */
  retryErrorCond?: RetryErrorCondFn;
}

export async function retryOnError<T>(
  fn: () => MaybePromise<T>,
  options?: RetryOnErrorOptions
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const retryDelay = options?.retryDelay ?? 1000; // ms
  const retryErrorCond = options?.retryErrorCond ?? retryAlwaysCond;

  let attemptNr = -1;
  do {
    try {
      attemptNr++;
      return await fn();
    } catch (error) {
      if (attemptNr < maxAttempts && retryErrorCond(error)) {
        if (retryDelay >= 0) {
          await new Promise((res) => {
            setTimeout(res, retryDelay);
          });
        }
        continue;
      }
      throw error;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
  } while (true);
}

export function wrapRetryOnError<T extends unknown[], U>(
  fn: (...args: T) => MaybeValue<U>,
  retryErrorCond: RetryErrorCondFn
): (...args: T) => MaybeValue<U> {
  return async (...args) => {
    return retryOnError(() => maybeCallFn(fn(...args)), {
      maxAttempts: 20,
      retryDelay: -1,
      retryErrorCond,
    });
  };
}

export function retryTimesCond(maxRetries: number): RetryErrorCondFn {
  let retriesRemaining = maxRetries;
  return () => {
    if (retriesRemaining <= 0) return false;
    retriesRemaining--;

    return true;
  };
}

export const retryAlwaysCond: RetryErrorCondFn = () => true;
