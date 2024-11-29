import { useReactiveVar } from '@apollo/client';
import { devNoteIdVar } from '../reactive-vars';
import { NoteIdProvider } from '../../note/context/note-id';
import { ReactNode } from 'react';
import { Typography } from '@mui/material';

export function DevActiveNoteIdProvider({ children }: { children: ReactNode }) {
  const devNoteId = useReactiveVar(devNoteIdVar);

  if (!devNoteId) {
    return <Typography>No note selected</Typography>;
  }

  return <NoteIdProvider noteId={devNoteId}>{children}</NoteIdProvider>;
}
