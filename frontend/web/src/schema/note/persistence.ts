import { LocalSession, Note } from '../__generated__/graphql';
//import { readActiveSession } from '../session/persistence';

export function readNextNodeId() {
  const nextId = localStorage.getItem('nextNoteId') ?? '1';
  const nextIdNr = Number.parseInt(nextId);

  // Increments id on every call
  localStorage.setItem('nextNoteId', String(Number.isNaN(nextIdNr) ? 1 : nextIdNr + 1));

  return nextId;
}

export function readSessionNotes(session: LocalSession): Note[] {
  const notesStr = localStorage.getItem(`notes:${session.id}`);
  return notesStr ? (JSON.parse(notesStr) as Note[]) : [];
}

export function saveSessionNotes(session: LocalSession, notes: Note[]) {
  localStorage.setItem(`notes:${session.id}`, JSON.stringify(notes));
}
