import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';

import { fromUserId as parseAuthfromUserId } from '../../../../../services/auth/parse-authentication-context';

import type { QueryResolvers } from './../../../types.generated';

export const signedInUser: NonNullable<QueryResolvers['signedInUser']> = async (
  _parent,
  arg,
  ctx
) => {
  const { mongoDB } = ctx;

  const { by } = arg;

  const auth = await parseAuthfromUserId(by.id, ctx);
  assertAuthenticated(auth);

  return {
    auth,
    query: mongoDB.loaders.user.createQueryFn({
      userId: auth.session.userId,
    }),
  };
};
