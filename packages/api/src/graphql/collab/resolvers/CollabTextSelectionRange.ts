import type { CollabTextSelectionRangeResolvers } from './../../types.generated';

export const CollabTextSelectionRange: CollabTextSelectionRangeResolvers = {
  end: (parent) => {
    return parent.end();
  },
  start: (parent) => {
    return parent.start();
  },
};
