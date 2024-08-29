import type { NotePreferencesResolvers } from '../../types.generated';

export const NotePreferences: NotePreferencesResolvers = {
  backgroundColor: async (parent, _arg, _ctx) => {
    return (await parent.query({ backgroundColor: 1 }))?.backgroundColor;
  },
};
