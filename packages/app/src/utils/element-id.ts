/**
 * Single file to define all custom element ids to avoid accidental collisions
 */

import { Note } from '../__generated__/graphql';

export function noteEditDialogId(noteId: Note['id']) {
  return `note-edit-dialog-${noteId}`;
}

export function noteSharingDialogId(noteId: Note['id']) {
  return `note-sharing-dialog-${noteId}`;
}
