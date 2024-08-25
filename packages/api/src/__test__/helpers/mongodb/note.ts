import { ObjectId } from 'mongodb';

import { NoteSchema } from '../../../mongodb/schema/note/note';

export function findNoteTextField(
  note: NoteSchema | undefined | null,
  fieldName: string
) {
  if (!note) return;

  const collabTexts = note.collab?.texts
    .filter((collabText) => collabText.k === fieldName)
    .map((collabText) => collabText.v);
  return collabTexts?.[0];
}

export function findNoteUser(userId: ObjectId, note?: NoteSchema | null) {
  return note?.users.find((noteUser) => noteUser._id.equals(userId));
}
