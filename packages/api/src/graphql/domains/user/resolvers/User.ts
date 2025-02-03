import { createMapQueryFn } from '../../../../mongodb/query/query';
import { UserSchema } from '../../../../mongodb/schema/user';
import type { UserResolvers } from '../../types.generated';

export const User: Pick<UserResolvers, 'id' | 'profile'> = {
  id: async (parent, _arg, _ctx) => {
    return (await parent.query({ _id: 1 }))?._id;
  },
  profile: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<UserSchema['profile']>()(
        (query) => ({ profile: query }),
        (result) => result.profile
      ),
    };
  },
};
