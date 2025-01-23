import { InferRaw } from 'superstruct';
import { assert, describe, expect, it } from 'vitest';
import { AuthenticationContext } from './authentication-context';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';
import { isAuthenticated } from './is-authenticated';
import { ObjectId } from 'mongodb';
import { objectIdToStr } from '../../mongodb/utils/objectid';

describe('AuthenticationContext', () => {
  it('parses unauthenticated', () => {
    const raw: InferRaw<typeof AuthenticationContext> = {
      reason: AuthenticationFailedReason.USER_NO_SESSION,
    };

    const auth = AuthenticationContext.create(raw);

    expect(isAuthenticated(auth)).toBeFalsy();
  });

  it('parses empty object', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    const raw: InferRaw<typeof AuthenticationContext> = {} as any;

    const auth = AuthenticationContext.create(raw);

    assert(!isAuthenticated(auth));

    expect(auth.reason).toStrictEqual(AuthenticationFailedReason.USER_UNDEFINED);
  });

  it('parses auth', () => {
    const raw: InferRaw<typeof AuthenticationContext> = {
      session: {
        expireAt: 0,
        _id: objectIdToStr(new ObjectId()),
        cookieId: 'abc',
        userId: objectIdToStr(new ObjectId()),
      },
    };

    const auth = AuthenticationContext.create(raw);

    expect(isAuthenticated(auth)).toBeTruthy();
  });
});
