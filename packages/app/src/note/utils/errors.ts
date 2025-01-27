import { Note } from '../../__generated__/graphql';

export function throwNoteNotFoundError(noteId?: Note['id']): never {
  if (noteId) {
    throw new Error(`Note "${noteId}" not found`);
  } else {
    throw new Error('Query is missing note id');
  }
}
