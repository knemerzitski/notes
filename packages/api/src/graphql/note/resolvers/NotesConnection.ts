import type { NotesConnectionResolvers } from './../../types.generated';

export const NotesConnection: NotesConnectionResolvers = {
  edges: (parent, _arg, ctx, info) => {
    return parent.edges(ctx, info);
  },
  notes: (parent, _arg, ctx, info) => {
    return parent.notes(ctx, info);
  },
};
