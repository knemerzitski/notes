import type { NoteResolvers } from '../../../graphql/types.generated';

export const Note: NoteResolvers = {
  id: (parent) => {
    return parent.id();
  },
  preferences: (parent) => {
    return parent.preferences();
  },
  readOnly: (parent) => {
    return parent.readOnly();
  },
  textFields: (parent) => {
    return parent.textFields();
  },
  noteId: (parent) => {
    return parent.noteId();
  },
};
