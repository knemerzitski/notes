import type { NoteEdgeResolvers } from './../../types.generated';

export const NoteEdge: NoteEdgeResolvers = {
  cursor: (parent) => {
    return parent.cursor();
  },
  node: (parent) => {
    return parent.node();
  },
};
