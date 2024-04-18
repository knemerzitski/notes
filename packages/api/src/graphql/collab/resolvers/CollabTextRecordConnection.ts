import type { CollabTextRecordConnectionResolvers } from './../../types.generated';
export const CollabTextRecordConnection: CollabTextRecordConnectionResolvers = {
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
