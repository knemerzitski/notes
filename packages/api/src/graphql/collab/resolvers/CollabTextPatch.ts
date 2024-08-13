import type { CollabTextPatchResolvers } from './../../types.generated';

export const CollabTextPatch: CollabTextPatchResolvers = {
  id: (parent) => {
    return parent.id();
  },
  isExistingRecord: (parent) => {
    return parent.isExistingRecord?.();
  },
  newRecord: (parent) => {
    return parent.newRecord?.();
  },
};
