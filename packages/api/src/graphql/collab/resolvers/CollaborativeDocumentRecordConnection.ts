import type { CollaborativeDocumentRecordConnectionResolvers } from './../../types.generated';
export const CollaborativeDocumentRecordConnection: CollaborativeDocumentRecordConnectionResolvers =
  {
    edges: (parent) => {
      return parent.edges();
    },
    pageInfo: (parent) => {
      return parent.pageInfo();
    },
  };
