import type { CollabTextEditingResolvers } from './../../types.generated';

export const CollabTextEditing: CollabTextEditingResolvers = {
  latestSelection: async (parent) => {
    return (await parent.query({ latestSelection: 1 }))?.latestSelection;
  },
  revision: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        revision: 1,
      })
    )?.revision;
  },
};
