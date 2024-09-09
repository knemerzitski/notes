import type { NoteShareAccessResolvers } from '../../types.generated';

export const NoteShareAccess: NoteShareAccessResolvers = {
  id: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        _id: 1,
      })
    )?.[0]?._id;
  },
  readOnly: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        permissions: {
          user: {
            readOnly: 1,
          },
        },
      })
    )?.[0]?.permissions?.user?.readOnly;
  },
};
