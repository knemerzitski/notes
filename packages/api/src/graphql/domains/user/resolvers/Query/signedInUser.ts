import { assertAuthenticated } from '../../../base/directives/auth';
import type { QueryResolvers } from './../../../types.generated';

export const signedInUser: NonNullable<QueryResolvers['signedInUser']> = (
  _parent,
  _arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.userId;

  return {
    query: (query) =>
      mongoDB.loaders.user.load({
        id: {
          userId: currentUserId,
        },
        query,
      }),
  };
};
