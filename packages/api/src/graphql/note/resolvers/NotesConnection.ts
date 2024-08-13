import type { NotesConnectionResolvers } from './../../types.generated';

export const NotesConnection: NotesConnectionResolvers = {
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
