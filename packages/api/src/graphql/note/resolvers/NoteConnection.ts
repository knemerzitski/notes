import type { NoteConnectionResolvers } from './../../types.generated';

export const NoteConnection: NoteConnectionResolvers = {
  edges: (parent) => {
    return parent.edges();
  },
  pageInfo: (parent) => {
    return parent.pageInfo();
  },
  notes: (parent) => {
    return parent.notes();
  },
};
