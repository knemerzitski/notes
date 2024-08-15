import type { NotesConnectionResolvers } from './../../types.generated';

export const NotesConnection: NotesConnectionResolvers = {
  edges: (parent, _arg, ctx, info) => {
    return parent.edges(ctx, info);
  },
  pageInfo: (parent) => {
    return parent.pageInfo();
  },
  notes: (parent, _arg, ctx, info) => {
    return parent.notes(ctx, info);
  },
};
