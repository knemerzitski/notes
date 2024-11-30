import { NoteCategory } from '../../__generated__/graphql';

export function isNoteEditable(categoryName: NoteCategory | false) {
  const isNoteDeleted = categoryName === false;
  if (isNoteDeleted) {
    return false;
  }

  const isTrashed = categoryName === NoteCategory.TRASH;

  return !isTrashed;
}
