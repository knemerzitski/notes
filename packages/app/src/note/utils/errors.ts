import { Note } from '../../__generated__/graphql';

export function throwNoteNotFoundError(noteId?: Note['id']): never {
  if (noteId) {
    throw new Error(`Note "${noteId}" not found`);
  } else {
    throw new Error('Query is missing note id');
  }
}

export function throwUserNoteLinkNotFoundError(userNoteLinkId?: Note['id']): never {
  if (userNoteLinkId) {
    throw new Error(`UserNoteLink "${userNoteLinkId}" not found`);
  } else {
    throw new Error('Query is missing userNoteLink id');
  }
}
