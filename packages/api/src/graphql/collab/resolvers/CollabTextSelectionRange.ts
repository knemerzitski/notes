import type { CollabTextSelectionRangeResolvers } from './../../types.generated';

export const CollabTextSelectionRange: CollabTextSelectionRangeResolvers = {
  end: async (parent) => {
    return (await parent.query({ end: 1 }))?.end;
  },
  start: async (parent) => {
    return (await parent.query({ start: 1 }))?.start;
  },
};
