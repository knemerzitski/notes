import { ObjectId } from 'mongodb';

import { NoteSchema } from '../../../mongodb/schema/note/note';

export function findNoteTextField(
  note: NoteSchema | undefined | null,
  fieldName: string
) {
  if (!note) return;

  const collabTexts = note.collabTexts
    ?.filter((collabText) => collabText.k === fieldName)
    .map((collabText) => collabText.v);
  return collabTexts?.[0];
}

export default function findNoteUserNote(userId: ObjectId, note?: NoteSchema) {
  return note?.userNotes.find((userNote) => userNote.userId.equals(userId));
}
