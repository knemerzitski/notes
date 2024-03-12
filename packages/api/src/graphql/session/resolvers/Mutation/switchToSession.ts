import type { MutationResolvers } from '../../../../graphql/types.generated';
import {
  headersSetCookieUpdateSessions,
  parseOnlyValidClientCookiesFromHeaders,
} from '../../auth-context';
export const switchToSession: NonNullable<MutationResolvers['switchToSession']> = (
  _parent,
  { input },
  { request, response }
) => {
  const clientCookies = parseOnlyValidClientCookiesFromHeaders(request.headers);
  if (!clientCookies) {
    return null;
  }

  const newCookieId = clientCookies.sessions[input.switchToSessionId];
  if (!newCookieId) {
    return null;
  }

  headersSetCookieUpdateSessions(response.multiValueHeaders, {
    ...clientCookies,
    currentUserPublicId: input.switchToSessionId,
    currentCookieId: newCookieId,
  });

  return {
    currentSessionId: input.switchToSessionId,
  };
};
