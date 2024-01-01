import type { MutationResolvers } from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
export const switchToSession: NonNullable<MutationResolvers['switchToSession']> = (
  _parent,
  { input },
  { auth: auth, response }
) => {
  assertAuthenticated(auth);

  if (input.switchToSessionIndex >= auth.cookie.sessions.length) {
    return {
      activeSessionIndex: auth.cookie.index,
    };
  }

  if (!('Set-Cookie' in response.multiValueHeaders)) {
    response.multiValueHeaders['Set-Cookie'] = [];
  }

  response.multiValueHeaders['Set-Cookie'].push(
    `ActiveSessionIndex=${input.switchToSessionIndex}; HttpOnly; Secure; SameSite=Strict`
  );

  return {
    activeSessionIndex: input.switchToSessionIndex,
  };
};
