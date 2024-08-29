import type { NoteResolvers } from '../../types.generated';

export const Note: Pick<NoteResolvers, 'id'> = {
  id: async (parent, _arg, _ctx) => {
    return (await parent.query({ _id: 1 }))?._id;
  },
};
