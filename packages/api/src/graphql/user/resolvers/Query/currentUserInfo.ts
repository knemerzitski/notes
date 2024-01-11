import { assertAuthenticated } from '../../../base/directives/auth';

import type { QueryResolvers } from './../../../types.generated';

export const currentUserInfo: NonNullable<QueryResolvers['currentUserInfo']> = (
  _parent,
  _arg,
  ctx
) => {
  const { auth } = ctx;
  assertAuthenticated(auth);

  const user = auth.session.user;

  return {
    profile: {
      displayName: user.profile.displayName,
    },
  };
};
