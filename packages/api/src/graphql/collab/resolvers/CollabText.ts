import type { CollabTextResolvers } from './../../types.generated';

export const CollabText: CollabTextResolvers = {
  headText: (parent) => {
    return parent.headText();
  },
  id: (parent) => {
    return parent.id();
  },
  recordsConnection: (parent, args) => {
    return parent.recordsConnection(args, {
      defaultSlice: 'end',
      defaultLimit: 20,
      maxLimit: 100,
    });
  },
  tailText: (parent) => {
    return parent.tailText();
  },
};
