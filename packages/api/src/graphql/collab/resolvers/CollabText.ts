import type { CollabTextResolvers } from './../../types.generated';

export const CollabText: CollabTextResolvers = {
  id: (parent) => {
    return parent.id();
  },
  headText: (parent) => {
    return parent.headText();
  },
  tailText: (parent) => {
    return parent.tailText();
  },
  textAtRevision: (parent, args) => {
    return parent.textAtRevision(args);
  },
  recordsConnection: (parent, args) => {
    return parent.recordsConnection(args, {
      defaultSlice: 'end',
      defaultLimit: 20,
      maxLimit: 100,
    });
  },
};
