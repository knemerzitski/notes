import { LocalNote } from '../__generated__/graphql';

const NOTES_LIST_KEY = 'note_list';
const NOTE_KEY = (noteId: string | number) => `note_note:${noteId}`;
const NOTE_NEXT_ID_KEY = 'note_nextNoteId';

/**
 * Increments integer (id) every time function is called.
 * @returns
 */
export function readNextNoteId() {
  const nextId = localStorage.getItem(NOTE_NEXT_ID_KEY) ?? '1';
  const nextIdNr = Number.parseInt(nextId);

  localStorage.setItem(
    NOTE_NEXT_ID_KEY,
    String(Number.isNaN(nextIdNr) ? 1 : nextIdNr + 1)
  );

  return nextId;
}

function readNotesList() {
  const notesLookupStr = localStorage.getItem(NOTES_LIST_KEY);
  return notesLookupStr ? (JSON.parse(notesLookupStr) as string[]) : [];
}

function saveNotesList(notes: string[]) {
  localStorage.setItem(NOTES_LIST_KEY, JSON.stringify(notes));
}

export function readNotes(): LocalNote[] {
  return readNotesList()
    .map((noteId) => readNote(noteId))
    .filter((note): note is LocalNote => Boolean(note));
}

export function readNote(id: string): LocalNote | null {
  const noteStr = localStorage.getItem(NOTE_KEY(id));
  return noteStr ? (JSON.parse(noteStr) as LocalNote) : null;
}

export function saveNote(note: LocalNote) {
  localStorage.setItem(NOTE_KEY(note.id), JSON.stringify(note));

  const list = readNotesList();
  const index = list.indexOf(String(note.id));
  if (index === -1) {
    // Inserts new note at the beginning of array
    list.unshift(String(note.id));
  }

  saveNotesList(list);
}

export function deleteNote(id: string) {
  const list = readNotesList();

  const index = list.indexOf(id);
  if (index !== -1) {
    list.splice(index, 1);
    saveNotesList(list);
  }

  localStorage.removeItem(NOTE_KEY(id));
}
