import {
  clientCookieFilterPublicUserIds,
  headersSetCookieDeleteSessions,
  headersSetCookieUpdateSessions,
  parseOnlyValidClientCookiesFromHeaders,
} from '../../auth-context';

import type { MutationResolvers } from './../../../types.generated';
export const syncSessions: NonNullable<MutationResolvers['syncSessions']> = (
  _parent,
  { input: { availableSessionIds } },
  ctx
) => {
  const { request, response } = ctx;

  const sessionCookie = parseOnlyValidClientCookiesFromHeaders(request.headers);

  if (sessionCookie) {
    const filteredSessionCookie = clientCookieFilterPublicUserIds(
      sessionCookie,
      availableSessionIds
    );

    if (filteredSessionCookie) {
      headersSetCookieUpdateSessions(response.multiValueHeaders, filteredSessionCookie);

      return {
        __typename: 'SyncSessionsSignInPayload',
        currentSessionId: filteredSessionCookie.currentUserPublicId,
        availableSessionIds: Object.keys(filteredSessionCookie.sessions),
      };
    }
  }

  headersSetCookieDeleteSessions(response.multiValueHeaders);
  return {
    __typename: 'SyncSessionsSignOutPayload',
    signedOut: true,
  };
};
