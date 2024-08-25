import type { NoteResolvers } from './../../types.generated';

export const Note: Pick<NoteResolvers, 'collab'> = {
  collab: (parent, _arg, _ctx) => {
    return parent;
  },
};
