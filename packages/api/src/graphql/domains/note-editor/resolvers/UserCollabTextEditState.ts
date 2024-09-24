import { createMapQueryFn } from '../../../../mongodb/query/query';
import { SelectionRangeSchema } from '../../../../mongodb/schema/collab-text';
import type { UserCollabTextEditStateResolvers } from './../../types.generated';

export const UserCollabTextEditState: UserCollabTextEditStateResolvers = {
  latestSelection: (parent) => {
    return {
      query: createMapQueryFn(parent.query)<SelectionRangeSchema>()(
        (query) => ({
          latestSelection: query,
        }),
        (result) => result.latestSelection
      ),
    };
  },
  revision: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        revision: 1,
      })
    )?.revision;
  },
};
