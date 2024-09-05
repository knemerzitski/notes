import { wrapQueryHelpers } from '../../../../mongodb/query/query';
import type { PublicUserResolvers } from './../../types.generated';

export const PublicUser: PublicUserResolvers = {
  id: async (parent, _arg, _ctx) => {
    return (await parent.query({ _id: 1 }))?._id;
  },
  profile: wrapQueryHelpers((helpers, parent, _arg, _ctx) => {
    return {
      query: helpers.redirect(
        parent.query,
        (query) => ({ profile: query }),
        (result) => result.profile
      ),
    };
  }),
};
