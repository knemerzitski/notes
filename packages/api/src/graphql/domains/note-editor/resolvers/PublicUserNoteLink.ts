import type { PublicUserNoteLinkResolvers } from '../../types.generated';
export const PublicUserNoteLink: Pick<PublicUserNoteLinkResolvers, 'editing'> = {
  /* Implement PublicUserNoteLink resolver logic here */
  editing: async (_parent, _arg, _ctx) => {
    /* PublicUserNoteLink.editing resolver is required because PublicUserNoteLink.editing exists but PublicUserNoteLinkMapper.editing does not */
  },
};
