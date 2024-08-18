import type { NotePreferencesResolvers } from '../../types.generated';

export const NotePreferences: NotePreferencesResolvers = {
  backgroundColor: async (parent) => {
    return (await parent.query({ backgroundColor: 1 }))?.backgroundColor;
  },
};
