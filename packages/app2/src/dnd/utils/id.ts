import { Note } from '../../__generated__/graphql';

export function getNoteDndId(noteId: Note['id']) {
  return `Note:${noteId}`;
}
