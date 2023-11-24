import type { MutationResolvers } from '../../../types.generated';
export const switchToSession: NonNullable<MutationResolvers['switchToSession']> = (
  _parent,
  { index },
  { auth: auth, response }
) => {
  if (!auth || index < 0 || index >= auth.sessions.length) return false;

  if (!('Set-Cookie' in response.multiValueHeaders)) {
    response.multiValueHeaders['Set-Cookie'] = [];
  }

  response.multiValueHeaders['Set-Cookie'].push(
    `ActiveSessionIndex=${index}; HttpOnly; Secure; SameSite=Strict`
  );

  return true;
};
