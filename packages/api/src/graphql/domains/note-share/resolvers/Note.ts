import type { NoteResolvers } from '../../types.generated';
export const Note: Pick<NoteResolvers, 'shareAccess'> = {
  /* Implement Note resolver logic here */
  shareAccess: async (_parent, _arg, _ctx) => {
    /* Note.shareAccess resolver is required because Note.shareAccess exists but NoteMapper.shareAccess does not */
  },
};
