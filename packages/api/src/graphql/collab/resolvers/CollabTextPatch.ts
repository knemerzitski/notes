import type { CollabTextPatchResolvers } from './../../types.generated';
export const CollabTextPatch: CollabTextPatchResolvers = {
  id: (parent) => {
    return parent.id();
  },
};
