import type { CollabTextRecordsConnectionResolvers } from './../../types.generated';
export const CollabTextRecordsConnection: CollabTextRecordsConnectionResolvers = {
  edges: (parent) => {
    return parent.edges();
  },
  pageInfo: (parent) => {
    return parent.pageInfo();
  },
  records: (parent) => {
    return parent.records();
  },
};
