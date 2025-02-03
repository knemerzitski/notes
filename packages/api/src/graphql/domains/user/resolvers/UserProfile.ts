import type { UserProfileResolvers } from '../../types.generated';

export const UserProfile: UserProfileResolvers = {
  displayName: async (parent, _arg, _ctx) => {
    return (await parent.query({ displayName: 1 }))?.displayName;
  },
};
