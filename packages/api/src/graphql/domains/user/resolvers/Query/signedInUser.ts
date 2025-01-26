import type { QueryResolvers } from './../../../types.generated';

export const signedInUser: NonNullable<QueryResolvers['signedInUser']> = async (
  _parent,
  arg,
  ctx
) => {
  const { mongoDB, services } = ctx;

  const { by } = arg;

  const auth = await services.auth.getAuth(by.id);

  return {
    auth,
    query: mongoDB.loaders.user.createQueryFn({
      userId: auth.session.userId,
    }),
  };
};
