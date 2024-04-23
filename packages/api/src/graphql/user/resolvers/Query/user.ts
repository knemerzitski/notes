import { assertAuthenticated } from '../../../base/directives/auth';

import type { QueryResolvers } from './../../../types.generated';
export const user: NonNullable<QueryResolvers['user']> = (_parent, _args, ctx) => {
  const { auth } = ctx;
  assertAuthenticated(auth);

  const user = auth.session.user;

  return {
    id: user._id.toString('base64'),
    profile: {
      displayName: user.profile.displayName,
    },
  };
};
