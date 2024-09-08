import type { NoteShareAccessResolvers } from '../../types.generated';

export const NoteShareAccess: NoteShareAccessResolvers = {
  id: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        shareNoteLinks: {
          _id: 1,
        },
      })
    )?.shareNoteLinks?.[0]?._id;
  },
  readOnly: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        shareNoteLinks: {
          permissions: {
            user: {
              readOnly: 1,
            },
          },
        },
      })
    )?.shareNoteLinks?.[0]?.permissions?.user?.readOnly;
  },
};
