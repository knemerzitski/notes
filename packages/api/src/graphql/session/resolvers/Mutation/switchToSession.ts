import type { MutationResolvers } from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
import { headersSetCookieUpdateSessions } from '../../auth-context';
export const switchToSession: NonNullable<MutationResolvers['switchToSession']> = (
  _parent,
  { input },
  { auth: auth, response }
) => {
  assertAuthenticated(auth);

  const newSessionId = auth.cookie.sessions[input.switchToSessionKey];
  if (!newSessionId) {
    return {
      currentSessionKey: auth.cookie.currentKey,
    };
  }

  headersSetCookieUpdateSessions(response.multiValueHeaders, {
    ...auth.cookie,
    currentKey: input.switchToSessionKey,
    currentId: newSessionId,
  });

  return {
    currentSessionKey: input.switchToSessionKey,
  };
};
