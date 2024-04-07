import type { NoteTextFieldEntryResolvers } from './../../types.generated';

export const NoteTextFieldEntry: NoteTextFieldEntryResolvers = {
  key: (parent) => {
    return parent.key();
  },
  value: (parent) => {
    return parent.value();
  },
};
