import { Assertion, expect } from 'vitest';

/**
 * Adds JSON pretty printed {@link actual} to message
 */
export default function expectp<T>(actual: T, message?: string): Assertion<T> {
  const errObj = JSON.stringify(actual, null, 2);

  return expect(actual, message ? message + '\n' + errObj : errObj);
}
