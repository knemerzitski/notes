import type { PublicUserResolvers } from './../../types.generated';

export const PublicUser: PublicUserResolvers = {
  id: async (parent) => {
    return (
      await parent.query({
        _id: 1,
      })
    )?._id;
  },
  displayName: async (parent) => {
    return (
      await parent.query({
        profile: {
          displayName: 1,
        },
      })
    )?.profile?.displayName;
  },
};
