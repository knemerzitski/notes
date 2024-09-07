import { createMapQueryFn, MongoQueryFnStruct } from '../../../../mongodb/query/query';
import { PublicUserProfileMapper } from '../schema.mappers';
import type { PublicUserResolvers } from './../../types.generated';

type PublicUserProfile = MongoQueryFnStruct<PublicUserProfileMapper['query']>;

export const PublicUser: PublicUserResolvers = {
  id: async (parent, _arg, _ctx) => {
    return (await parent.query({ _id: 1 }))?._id;
  },
  profile: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<PublicUserProfile>()(
        (query) => ({ profile: query }),
        (result) => result.profile
      ),
    };
  },
};
