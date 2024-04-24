import { CollectionName } from '../../../../mongodb/collections';
import { isAuthenticated } from '../../../auth-context';
import CookiesContext from '../../../cookies-context';

import type { MutationResolvers } from './../../../types.generated';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  { input },
  ctx
) => {
  const {
    mongodb: { collections },
    cookies,
    auth,
    response,
  } = ctx;

  if (input?.allUsers) {
    const cookieIds = Object.values(cookies.sessions);
    if (cookieIds.length > 0) {
      // Deletes all sessions from database
      await collections[CollectionName.Sessions].deleteMany({
        cookieId: {
          $in: cookieIds,
        },
      });
    }
  } else {
    const userAuth = isAuthenticated(auth) ? auth : null;

    // Delete specific session from database, by default current user session
    const userId = input?.userId ?? userAuth?.session.user._id.toString('base64');
    const cookieId = userId ? cookies.sessions[userId] : undefined;

    if (!cookieId || !userId) {
      return {
        signedOut: false,
      };
    }

    await collections[CollectionName.Sessions].deleteOne({
      cookieId,
    });

    cookies.deleteSession(userId);
    if (Object.keys(cookies.sessions).length > 0) {
      // Still have existing sessions, update cookies accordingly
      cookies.setCookieHeadersUpdate(response.multiValueHeaders);

      return {
        signedOut: true,
      };
    }
  }

  // Deletes all cookies
  CookiesContext.setCookieHeadersClear(response.multiValueHeaders);

  return {
    signedOut: true,
  };
};
