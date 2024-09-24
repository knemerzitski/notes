import { createMapQueryFn } from '../../../../mongodb/query/query';
import { SelectionRangeSchema } from '../../../../mongodb/schema/collab-text';
import type { UserCollabTextStateResolvers } from '../../types.generated';

export const UserCollabTextState: UserCollabTextStateResolvers = {
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
