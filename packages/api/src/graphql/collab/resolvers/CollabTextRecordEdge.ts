import type { CollabTextRecordEdgeResolvers } from './../../types.generated';

export const CollabTextRecordEdge: CollabTextRecordEdgeResolvers = {
  cursor: (parent) => {
    return parent.cursor();
  },
  node: (parent) => {
    return parent.node();
  },
};
