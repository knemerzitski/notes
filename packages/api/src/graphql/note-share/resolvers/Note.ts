import type { NoteResolvers } from '../../types.generated';

export const Note: Pick<NoteResolvers, 'shareLink'> = {
  shareLink: (parent) => {
    return null;
  },
};
