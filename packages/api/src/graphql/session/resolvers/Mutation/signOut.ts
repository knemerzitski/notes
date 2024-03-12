import type { MutationResolvers } from '../../../../graphql/types.generated';
import {
  createClientCookiesDeleteByKey as createCookieDeleteByUserPublicId,
  headersSetCookieDeleteSessions,
  headersSetCookieUpdateSessions,
  parseOnlyValidClientCookiesFromHeaders,
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

  const clientCookies = parseOnlyValidClientCookiesFromHeaders(request.headers);

  if (input?.allSessions) {
    if (clientCookies) {
      // Deletes all sessions from database
      await model.Session.deleteMany({
        cookieId: {
          $in: Object.values(clientCookies.sessions),
        },
      });
    }
  } else {
    // Delete specific session from database, by default current session
    const userPublicId = input?.sessionId ?? clientCookies?.currentUserPublicId;
    const cookieId = input?.sessionId
      ? clientCookies?.sessions[input.sessionId]
      : clientCookies?.currentCookieId;

    if (!cookieId || !userPublicId || !clientCookies) {
      return {
        signedOut: false,
      };
    }

    await model.Session.deleteOne({
      cookieId,
    });

    const sessionCookie = createCookieDeleteByUserPublicId(clientCookies, userPublicId);

    if (sessionCookie) {
      // Still have existing sessions, update cookies accordingly
      headersSetCookieUpdateSessions(response.multiValueHeaders, sessionCookie);

      return {
        signedOut: true,
        currentSessionId: sessionCookie.currentUserPublicId,
      };
    }
  }

  // Deletes all cookies and signs out
  headersSetCookieDeleteSessions(response.multiValueHeaders);

  return {
    signedOut: true,
  };
};
