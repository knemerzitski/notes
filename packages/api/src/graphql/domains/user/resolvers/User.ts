import type { UserResolvers } from '../../types.generated';

export const User: Pick<UserResolvers, 'id' | 'public'> = {
  id: async (parent, _arg, _ctx) => {
    return (await parent.query({ _id: 1 }))?._id;
  },
  public: (parent, _arg, _ctx) => {
    return {
      query: parent.query,
    };
  },
};
