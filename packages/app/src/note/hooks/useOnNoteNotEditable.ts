import { Note } from '../../__generated__/graphql';
import { isNoteEditable } from '../utils/is-note-editable';

import { useCategoryChanged } from './useCategoryChanged';

export function useOnNoteNotEditable(noteId: Note['id'], callback: () => void) {
  useCategoryChanged(noteId, (categoryName) => {
    if (!isNoteEditable(categoryName)) {
      callback();
    }
  });
}
