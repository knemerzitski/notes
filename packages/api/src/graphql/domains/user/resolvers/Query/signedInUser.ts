import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
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
    query: mongoDB.loaders.user.createQueryFn({
      userId: currentUserId,
    }),
  };
};
