import { UserNote } from '../__generated__/graphql';

const NOTES_TABLE_KEY = 'note_notesTable';
const NOTE_KEY = (noteId: string) => `note_note:${noteId}`;
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

function readNotesTable() {
  const notesLookupStr = localStorage.getItem(NOTES_TABLE_KEY);
  return notesLookupStr ? (JSON.parse(notesLookupStr) as string[]) : [];
}

function saveNotesTable(notes: string[]) {
  localStorage.setItem(NOTES_TABLE_KEY, JSON.stringify(notes));
}

export function readNotes(): UserNote[] {
  return readNotesTable()
    .map((noteId) => readNote(noteId))
    .filter((note): note is UserNote => Boolean(note));
}

export function readNote(id: string): UserNote | null {
  const noteStr = localStorage.getItem(NOTE_KEY(id));
  return noteStr ? (JSON.parse(noteStr) as UserNote) : null;
}

export function saveNote(note: UserNote) {
  localStorage.setItem(NOTE_KEY(note.id), JSON.stringify(note));

  const table = readNotesTable();

  // Insert note at the beginning of array
  table.unshift(note.id);

  saveNotesTable(table);
}

export function deleteNote(id: string) {
  const table = readNotesTable();

  const index = table.indexOf(id);
  if (index !== -1) {
    table.splice(index, 1);
    saveNotesTable(table);
  }

  localStorage.removeItem(NOTE_KEY(id));
}
