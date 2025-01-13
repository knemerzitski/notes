import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';

import { AuthenticationContext } from '../../../../../services/auth/authentication-context';
import { fromUserId as parseAuthfromUserId } from '../../../../../services/auth/parse-authentication-context';

import type { QueryResolvers } from './../../../types.generated';

export const signedInUser: NonNullable<QueryResolvers['signedInUser']> = async (
  _parent,
  arg,
  ctx
) => {
  const { mongoDB } = ctx;

  const { by } = arg;

  let auth: AuthenticationContext;
  if (by) {
    // Custom userId different from headers
    auth = await parseAuthfromUserId(by.id, ctx);
  } else {
    // Default assume authentication context is provided in headers
    auth = ctx.auth;
  }

  assertAuthenticated(auth);

  return {
    auth,
    query: mongoDB.loaders.user.createQueryFn({
      userId: auth.session.userId,
    }),
  };
};
