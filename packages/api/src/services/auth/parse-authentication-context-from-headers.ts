import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { Cookies } from '../http/cookies';

import { AuthenticatedFailedError } from './authentication-context';
import {
  FindRefreshSessionByCookieIdParams,
  findRefreshSessionByCookieId,
} from './find-refresh-session-by-cookie-id';

export interface ParseAuthenticationContextFromHeadersParams {
  headers?: Readonly<Record<string, string | undefined>> | undefined;
  cookies: Cookies;
  sessionParams: FindRefreshSessionByCookieIdParams;
}

export async function parseAuthenticationContextFromHeaders({
  headers,
  cookies,
  sessionParams,
}: ParseAuthenticationContextFromHeadersParams) {
  try {
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

    const cookieId = cookies.getSessionCookieId(userId);
    if (!cookieId) {
      return {
        reason: AuthenticationFailedReason.USER_NO_SESSION,
      };
    }

    const session = await findRefreshSessionByCookieId(cookieId, sessionParams);
    return {
      session,
    };
  } catch (err) {
    if (err instanceof AuthenticatedFailedError) {
      return {
        reason: err.reason,
      };
    } else {
      throw err;
    }
  }
}
