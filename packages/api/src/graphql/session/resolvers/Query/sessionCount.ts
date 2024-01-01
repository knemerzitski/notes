import type { QueryResolvers } from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
export const sessionCount: NonNullable<QueryResolvers['sessionCount']> = (
  _parent,
  _arg,
  ctx
) => {
  const { auth } = ctx;
  assertAuthenticated(auth);

  return auth.cookie.sessions.length;
};
