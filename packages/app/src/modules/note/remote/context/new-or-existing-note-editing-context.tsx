import { ReactNode } from 'react';

import { NewNoteEditingContext } from './new-note-editing-context';
import { NoteEditingContext } from './note-editing-context';

interface DynamicNoteEditingContextOptions {
  noteContentId?: string;
  isNewNote?: boolean;
  children: ReactNode;
}

export function NewOrExistingNoteEditingContext({
  noteContentId,
  isNewNote,
  children,
}: DynamicNoteEditingContextOptions) {
  if (!noteContentId || isNewNote) {
    return <NewNoteEditingContext>{children}</NewNoteEditingContext>;
  }

  return (
    <NoteEditingContext noteContentId={noteContentId}>{children}</NoteEditingContext>
  );
}
