import type { NoteResolvers } from '../../types.generated';
export const Note: NoteResolvers = {
  id(note) {
    return note.id;
  },
  userId(note) {
    return note.userId;
  },
  title(note) {
    return note.title;
  },
  content(note) {
    return note.content;
  },
};
