import { useNoteId } from '../../../note/context/note-id';

export function CurrentNoteId() {
  const noteId = useNoteId();

  return noteId;
}
