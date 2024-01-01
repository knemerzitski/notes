import { assertAuthenticated } from '../../../base/directives/auth';
import type { QueryResolvers } from '../../../types.generated';

export const activeUserInfo: NonNullable<QueryResolvers['activeUserInfo']> = (
  _parent,
  _arg,
  ctx
) => {
  const { auth } = ctx;
  assertAuthenticated(auth);

  const user = auth.session.user;

  return {
    offlineMode: {
      id: user.offline.id,
    },
    profile: {
      displayName: user.profile.displayName,
    },
  };
};
