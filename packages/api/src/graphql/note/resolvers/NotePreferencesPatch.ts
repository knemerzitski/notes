import type { NotePreferencesPatchResolvers } from './../../types.generated';

export const NotePreferencesPatch: NotePreferencesPatchResolvers = {
  backgroundColor: (parent, _arg, _ctx) => {
    return parent.backgroundColor?.();
  },
};
