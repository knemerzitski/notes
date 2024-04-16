import type { CollabTextRecordResolvers } from './../../types.generated';

export const CollabTextRecord: CollabTextRecordResolvers = {
  id: (parent) => {
    return parent.id();
  },
  afterSelection: (parent) => {
    return parent.afterSelection();
  },
  beforeSelection: (parent) => {
    return parent.beforeSelection();
  },
  change: (parent) => {
    return parent.change();
  },
  creatorUserId: (parent) => {
    return parent.creatorUserId();
  },
};
