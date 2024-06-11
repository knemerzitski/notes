import type { NoteResolvers } from './../../types.generated';

export const Note: Pick<NoteResolvers, 'sharing'> = {
  sharing: (parent, _arg, _ctx) => {
    return parent.sharing();
  },
};
