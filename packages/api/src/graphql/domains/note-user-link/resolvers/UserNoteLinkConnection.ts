import type { UserNoteLinkConnectionResolvers } from '../../types.generated';

export const UserNoteLinkConnection: UserNoteLinkConnectionResolvers = {
  edges: (parent, _arg, ctx, info) => {
    return parent.edges(ctx, info);
  },
  noteLinks: (parent, _arg, ctx, info) => {
    return parent.noteLinks(ctx, info);
  },
};
