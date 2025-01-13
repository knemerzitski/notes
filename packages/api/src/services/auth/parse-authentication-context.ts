import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { Cookies } from '../http/cookies';

import {
  AuthenticatedFailedError,
  AuthenticationContext,
} from './authentication-context';
import { UnauthenticatedServiceError } from './errors';
import { findRefreshSessionByCookieId } from './find-refresh-session-by-cookie-id';

export async function fromHeaders(
  headers: Readonly<Record<string, string | undefined>> | undefined,
  ctx: Parameters<typeof fromUserId>[1]
) {
  if (!headers) {
    return {
      reason: AuthenticationFailedReason.USER_UNDEFINED,
    };
  }

  const userId = headers[CustomHeaderName.USER_ID];
  if (!userId) {
    return {
      reason: AuthenticationFailedReason.USER_UNDEFINED,
    };
  }

  return fromUserId(userId, ctx);
}

export async function fromUserId(
  userId: Parameters<Cookies['getSessionCookieId']>[0],
  ctx: {
    cookies: Pick<Cookies, 'getSessionCookieId'>;
  } & Parameters<typeof findRefreshSessionByCookieId>[1]
): Promise<AuthenticationContext> {
  try {
    const cookieId = ctx.cookies.getSessionCookieId(userId);
    if (!cookieId) {
      return {
        reason: AuthenticationFailedReason.USER_NO_SESSION,
      };
    }

    const session = await findRefreshSessionByCookieId(cookieId, ctx);
    return {
      session,
    };
  } catch (err) {
    if (err instanceof AuthenticatedFailedError) {
      throw new UnauthenticatedServiceError({
        reason: err.reason,
      });
    } else {
      throw err;
    }
  }
}
