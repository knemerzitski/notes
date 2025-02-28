import { describe, expect, it } from 'vitest';
import { createLogger } from './logging';

describe('extend', () => {
  it('returns new logger for different namespace', () => {
    const logger = createLogger('root');

    const foo = logger.extend('foo');
    const bar = logger.extend('bar');

    expect(foo).not.toStrictEqual(bar);
  });

  it('memoizes same namespaces', () => {
    const logger = createLogger('root');

    const foo = logger.extend('foo');
    const foo2 = logger.extend('foo');

    expect(foo).toStrictEqual(foo2);
  });
});
