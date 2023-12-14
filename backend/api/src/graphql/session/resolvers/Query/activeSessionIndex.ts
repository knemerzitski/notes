import type { QueryResolvers } from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
export const activeSessionIndex: NonNullable<QueryResolvers['activeSessionIndex']> = (
  _parent,
  _arg,
  ctx
) => {
  const { auth } = ctx;
  assertAuthenticated(auth);

  return auth.cookie.index;
};
