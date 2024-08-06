import type { NoteResolvers } from './../../types.generated';

export const Note: Pick<NoteResolvers, 'sharing'> = {
  sharing: (parent) => {
    return parent.sharing();
  },
};
