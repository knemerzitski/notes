import type { UserResolvers } from '../../types.generated';
export const User: UserResolvers = {
  id(user) {
    return user.id;
  },
};
