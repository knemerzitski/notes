import { InferRaw } from 'superstruct';
import { describe, expect, it } from 'vitest';
import { CookiesStruct } from './cookies';

describe('CookiesStruct', () => {
  it('parses defined sessions', () => {
    const raw: InferRaw<typeof CookiesStruct> = {
      sessions: {
        a: 'b',
      },
    };

    const cookies = CookiesStruct.create(raw);

    expect(cookies.getSessionCookieId('a')).toStrictEqual('b');
  });

  it('parses empty object', () => {
    const raw: InferRaw<typeof CookiesStruct> = {};

    const cookies = CookiesStruct.create(raw);

    expect(cookies.hasNoSessions()).toBeTruthy();
  });
});
