import { assertAuthenticated } from '../../../base/directives/auth';
import type { QueryResolvers } from './../../../types.generated';

export const signedInUser: NonNullable<QueryResolvers['signedInUser']> = (
  _parent,
  _arg,
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  return {
    query: (query) =>
      mongodb.loaders.user.load({
        id: {
          userId: currentUserId,
        },
        query,
      }),
  };
};
