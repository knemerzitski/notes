import type { PublicUserProfileResolvers } from './../../types.generated';

export const PublicUserProfile: PublicUserProfileResolvers = {
  displayName: async (parent, _arg, _ctx) => {
    return (await parent.query({ displayName: 1 }))?.displayName;
  },
};
