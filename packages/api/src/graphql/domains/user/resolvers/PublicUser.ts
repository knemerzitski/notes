import type { PublicUserResolvers } from './../../types.generated';

export const PublicUser: PublicUserResolvers = {
  id: async (parent, _arg, _ctx) => {
    return (await parent.query({ _id: 1 }))?._id;
  },
  profile: (parent, _arg, _ctx) => {
    return {
      query: async (query) => (await parent.query({ profile: query }))?.profile,
    };
  },
};
