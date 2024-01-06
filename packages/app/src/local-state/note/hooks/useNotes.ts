import {
  readNextNoteId,
  saveNote,
  deleteNote as persistenceDeleteNote,
} from '../persistence';
import { notesVar as defaultNotesVar } from '../state';

interface CreateNoteInput {
  title?: string;
  textContent?: string;
  backgroundColor?: string;
  readOnly?: boolean;
}

interface PatchNoteInput extends Partial<CreateNoteInput> {
  id: string;
}

export default function useNotes(
  notesVar = defaultNotesVar,
  persistence = {
    save: saveNote,
    delete: persistenceDeleteNote,
  }
) {
  function createNote(newNote: CreateNoteInput) {
    const notes = notesVar();
    const id = readNextNoteId();

    const note = {
      ...newNote,
      title: newNote.title ?? '',
      textContent: newNote.textContent ?? '',
      id,
    };
    persistence.save(note);

    notesVar([note, ...notes]);

    return note;
  }

  function updateNote(notePatch: PatchNoteInput) {
    const notes = notesVar();
    const existingNoteIndex = notes.findIndex((note) => note.id === notePatch.id);
    if (existingNoteIndex === -1) return false;
    const existingNote = notes[existingNoteIndex];

    const updatedNote = {
      ...existingNote,
      ...notePatch,
    };

    persistence.save(updatedNote);

    notesVar([
      ...notes.slice(0, existingNoteIndex),
      updatedNote,
      ...notes.slice(existingNoteIndex + 1),
    ]);

    return updatedNote;
  }

  function deleteNote(id: string) {
    const notes = notesVar();

    persistence.delete(id);

    notesVar(notes.filter((note) => note.id !== id));

    return true;
  }

  return {
    operations: {
      createNote,
      updateNote,
      deleteNote,
    },
  };
}
