import { assertAuthenticated } from '../../../base/directives/auth';

import type { QueryResolvers } from './../../../types.generated';
export const currentSessionIndex: NonNullable<QueryResolvers['currentSessionIndex']> = (
  _parent,
  _arg,
  ctx
) => {
  const { auth } = ctx;
  assertAuthenticated(auth);

  return auth.cookie.index;
};
