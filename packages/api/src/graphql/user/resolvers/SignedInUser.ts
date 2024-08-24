import type { SignedInUserResolvers } from './../../types.generated';

export const SignedInUser: SignedInUserResolvers = {
  id: async (parent, _arg, _ctx) => {
    return (await parent.query({ _id: 1 }))?._id;
  },
  public: (parent, _arg, _ctx) => {
    return {
      query: parent.query,
    };
  },
};
