import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { deleteAllSessionsInCookies } from '../../../../../services/auth/delete-all-sessions-in-cookies';
import { deleteSessionWithCookies } from '../../../../../services/auth/delete-session-with-cookies';
import { isAuthenticated } from '../../../../../services/auth/is-authenticated';

import type { MutationResolvers } from './../../../types.generated';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  arg,
  ctx
) => {
  const { mongoDB, cookies, response } = ctx;

  const { input } = arg;

  let signedOutUserIds: string[] = [];
  if (input?.allUsers) {
    // Sign out all users
    signedOutUserIds = cookies.getAvailableSessionUserIds();

    await deleteAllSessionsInCookies({
      cookies,
      mongoDB,
    });
  } else {
    if (input?.userId) {
      signedOutUserIds = [objectIdToStr(input.userId)];

      // Sign out specified user
      await deleteSessionWithCookies({
        userId: input.userId,
        cookieId: cookies.getSessionCookieId(input.userId),
        cookies,
        mongoDB,
      });
    } else if (isAuthenticated(ctx.auth)) {
      signedOutUserIds = [objectIdToStr(ctx.auth.session.userId)];

      // Sign out authenticated user
      await deleteSessionWithCookies({
        userId: ctx.auth.session.userId,
        cookieId: ctx.auth.session.cookieId,
        cookies,
        mongoDB,
      });
    }
  }

  if (isAuthenticated(ctx.auth)) {
    ctx.auth = {
      reason: AuthenticationFailedReason.USER_NO_SESSION,
    };
  }

  cookies.putCookiesToHeaders(response.multiValueHeaders);

  return {
    signedOutUserIds,
    availableUserIds: cookies.getAvailableSessionUserIds(),
  };
};
