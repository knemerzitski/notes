import type { SignedInUserResolvers } from './../../types.generated';

export const SignedInUser: Pick<SignedInUserResolvers, 'id' | 'public'> = {
  id: async (parent, _arg, _ctx) => {
    return (await parent.query({ _id: 1 }))?._id;
  },
  public: (parent, _arg, _ctx) => {
    return {
      query: parent.query,
    };
  },
};
