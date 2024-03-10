import {
  cookieFilterKeys,
  headersSetCookieDeleteSessions,
  headersSetCookieUpdateSessions,
  parseOnlyValidCookiesFromHeaders,
} from '../../auth-context';

import type { MutationResolvers } from './../../../types.generated';
export const syncSessions: NonNullable<MutationResolvers['syncSessions']> = (
  _parent,
  { input: { availableSessionKeys } },
  ctx
) => {
  const { request, response } = ctx;

  const sessionCookie = parseOnlyValidCookiesFromHeaders(request.headers);

  if (sessionCookie) {
    const filteredSessionCookie = cookieFilterKeys(sessionCookie, availableSessionKeys);

    if (filteredSessionCookie) {
      headersSetCookieUpdateSessions(response.multiValueHeaders, filteredSessionCookie);

      return {
        __typename: 'SyncSessionsSignInPayload',
        currentSessionKey: filteredSessionCookie.currentKey,
        availableSessionKeys: Object.keys(filteredSessionCookie.sessions),
      };
    }
  }

  headersSetCookieDeleteSessions(response.multiValueHeaders);
  return {
    __typename: 'SyncSessionsSignOutPayload',
    signedOut: true,
  };
};
