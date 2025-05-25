import { debug } from 'debug';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createLogger } from './logging';

beforeAll(() => {
  debug.enable('*');
  vi.useFakeTimers();
  vi.setSystemTime(946684800000);
});

afterAll(() => {
  vi.clearAllTimers();
});

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

it('allows overriding console', () => {
  const infoFn = vi.fn();
  const logger = createLogger('root', {
    format: 'json',
    console: {
      info: infoFn,
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  });

  logger.info('hi');

  expect(infoFn.mock.calls).toMatchInlineSnapshot(`
    [
      [
        "2000-01-01T00:00:00.000Z root:INFO %s",
        "hi",
      ],
    ]
  `);
});

it('allows anything as message', () => {
  const infoFn = vi.fn();
  const logger = createLogger('root', {
    format: 'json',
    console: {
      info: infoFn,
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  });

  logger.info({ foo: 'bar' });

  expect(infoFn.mock.calls).toMatchInlineSnapshot(`
    [
      [
        "2000-01-01T00:00:00.000Z root:INFO {"message":{"foo":"bar"}}",
      ],
    ]
  `);
});
