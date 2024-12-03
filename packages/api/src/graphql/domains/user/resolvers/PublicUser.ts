import { createMapQueryFn } from '../../../../mongodb/query/query';
import { UserSchema } from '../../../../mongodb/schema/user';

import type { PublicUserResolvers } from './../../types.generated';

export const PublicUser: PublicUserResolvers = {
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
