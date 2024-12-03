import { useReactiveVar } from '@apollo/client';

import { Typography } from '@mui/material';
import { ReactNode } from 'react';

import { NoteIdProvider } from '../../note/context/note-id';
import { devNoteIdVar } from '../reactive-vars';

export function DevActiveNoteIdProvider({ children }: { children: ReactNode }) {
  const devNoteId = useReactiveVar(devNoteIdVar);

  if (!devNoteId) {
    return <Typography>No note selected</Typography>;
  }

  return <NoteIdProvider noteId={devNoteId}>{children}</NoteIdProvider>;
}
