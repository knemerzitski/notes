import { isAuthenticated } from '../../../auth-context';
import CookiesContext from '../../../cookies-context';

import type { MutationResolvers } from './../../../types.generated';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  { input },
  ctx
) => {
  const {
    mongoose: { model },
    cookies,
    auth,
    response,
  } = ctx;

  if (input?.allUsers) {
    const cookieIds = Object.values(cookies.sessions);
    if (cookieIds.length > 0) {
      // Deletes all sessions from database
      await model.Session.deleteMany({
        cookieId: {
          $in: cookieIds,
        },
      });
    }
  } else {
    const userAuth = isAuthenticated(auth) ? auth : null;
    // Delete specific session from database, by default current user session
    const userPublicId = input?.userId ?? userAuth?.session.user.publicId;
    const cookieId = userPublicId ? cookies.sessions[userPublicId] : undefined;

    if (!cookieId || !userPublicId) {
      return {
        signedOut: false,
      };
    }

    await model.Session.deleteOne({
      cookieId,
    });

    cookies.deleteSession(userPublicId);
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
