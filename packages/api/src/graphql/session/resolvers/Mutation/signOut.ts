import type { MutationResolvers } from '../../../../graphql/types.generated';
import {
  createCookieDeleteByKey,
  headersSetCookieDeleteSessions,
  headersSetCookieUpdateSessions,
  parseAuthFromHeaders,
} from '../../auth-context';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  { input },
  ctx
) => {
  const {
    mongoose: { model },
    request,
    response,
  } = ctx;

  // Parse auth if it's available
  const auth = await parseAuthFromHeaders(
    request.headers,
    model.Session,
    ctx.session.tryRefreshExpireAt
  );

  if (input?.allSessions) {
    if (auth.cookie) {
      // Deletes all sessions from database
      await model.Session.deleteMany({
        cookieId: {
          $in: Object.values(auth.cookie.sessions),
        },
      });
    }
  } else {
    // Delete specific session from database, by default current session
    const sessionKey = input?.sessionKey ?? auth.cookie?.currentKey;
    const cookieId = input?.sessionKey
      ? auth.cookie?.sessions[input.sessionKey]
      : auth.cookie?.currentId;

    if (!cookieId || !sessionKey || !auth.cookie) {
      return {
        signedOut: false,
      };
    }

    await model.Session.deleteOne({
      cookieId,
    });

    const sessionCookie = createCookieDeleteByKey(auth.cookie, sessionKey);

    if (sessionCookie) {
      // Still have existing sessions, update cookies accordingly
      headersSetCookieUpdateSessions(response.multiValueHeaders, sessionCookie);

      return {
        signedOut: true,
        currentSessionKey: sessionCookie.currentKey,
      };
    }
  }

  // Deletes all cookies and signs out
  headersSetCookieDeleteSessions(response.multiValueHeaders);

  return {
    signedOut: true,
  };
};
