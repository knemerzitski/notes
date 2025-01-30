import type { QueryResolvers } from './../../../types.generated';

export const signedInUser: NonNullable<QueryResolvers['signedInUser']> = (
  _parent,
  arg,
  ctx
) => {
  const { mongoDB } = ctx;
  const { by } = arg;

  return {
    userId: by.id,
    query: mongoDB.loaders.user.createQueryFn({
      userId: by.id,
    }),
  };
};
