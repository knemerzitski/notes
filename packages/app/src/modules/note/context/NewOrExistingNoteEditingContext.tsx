import { ReactNode } from 'react';
import NewNoteEditingContext from './NewNoteEditingContext';
import { NoteEditingContext } from './NoteEditingContext';

interface DynamicNoteEditingContextOptions {
  noteContentId?: string;
  isNewNote?: boolean;
  children: ReactNode;
}

export default function NewOrExistingNoteEditingContext({
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
