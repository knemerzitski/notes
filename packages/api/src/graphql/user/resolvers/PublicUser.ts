import type { PublicUserResolvers } from './../../types.generated';

export const PublicUser: PublicUserResolvers = {
  id: async (parent) => {
    return parent.id();
  },
  displayName: (parent) => {
    return parent.displayName();
  },
};
