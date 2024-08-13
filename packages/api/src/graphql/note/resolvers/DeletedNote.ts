import type { DeletedNoteResolvers } from './../../types.generated';

export const DeletedNote: DeletedNoteResolvers = {
  id: (parent) => {
    return parent.id();
  },
};
