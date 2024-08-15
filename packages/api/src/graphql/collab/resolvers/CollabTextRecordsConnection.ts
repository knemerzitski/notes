import type { CollabTextRecordsConnectionResolvers } from './../../types.generated';
export const CollabTextRecordsConnection: CollabTextRecordsConnectionResolvers = {
  edges: (parent, _args, ctx, info) => {
    return parent.edges(ctx, info);
  },
  pageInfo: (parent) => {
    return parent.pageInfo();
  },
  records: (parent, _args, ctx, info) => {
    return parent.records(ctx, info);
  },
};
