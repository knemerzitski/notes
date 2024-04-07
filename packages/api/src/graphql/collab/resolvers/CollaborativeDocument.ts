import type { CollaborativeDocumentResolvers } from './../../types.generated';
export const CollaborativeDocument: CollaborativeDocumentResolvers = {
  headDocument: (parent) => {
    return parent.headDocument();
  },
  id: (parent) => {
    return parent.id();
  },
  recordsConnection: (parent, args) => {
    return parent.recordsConnection(args, {
      defaultSlice: 'end',
      defaultLimit: 20,
      maxLimit: 100,
    });
  },
  tailDocument: (parent) => {
    return parent.tailDocument();
  },
  document: (parent, args) => {
    return parent.document(args);
  },
};
