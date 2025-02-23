import { useNoteId } from '../context/note-id';

export function NoteId() {
  const noteId = useNoteId();

  return noteId;
}
