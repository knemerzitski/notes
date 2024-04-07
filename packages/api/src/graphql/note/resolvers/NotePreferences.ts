import type { NotePreferencesResolvers } from './../../types.generated';

export const NotePreferences: NotePreferencesResolvers = {
  backgroundColor: (parent) => {
    return parent.backgroundColor();
  },
};
