import type { NoteConnectionResolvers } from '../../types.generated';

export const NoteConnection: NoteConnectionResolvers = {
  edges: (parent, _arg, ctx, info) => {
    return parent.edges(ctx, info);
  },
  notes: (parent, _arg, ctx, info) => {
    return parent.notes(ctx, info);
  },
};
