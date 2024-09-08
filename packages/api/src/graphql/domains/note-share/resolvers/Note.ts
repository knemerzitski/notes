import type { NoteResolvers } from './../../types.generated';

export const Note: Pick<NoteResolvers, 'shareAccess'> = {
  shareAccess: (parent, _arg, _ctx) => {
    return {
      query: parent.query,
    };
  },
};
