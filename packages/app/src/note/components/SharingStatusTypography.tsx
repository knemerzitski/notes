import { useFragment } from '@apollo/client';
import { Typography } from '@mui/material';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';

const SharingStatusTypography_NoteFragment = gql(`
  fragment SharingStatusTypography_NoteFragment on Note {
    id
    shareAccess {
      id
    }
  }
`);

export function SharingStatusTypography() {
  const noteId = useNoteId();
  const { data: note } = useFragment({
    fragment: SharingStatusTypography_NoteFragment,
    from: {
      __typename: 'Note',
      id: noteId,
    },
  });

  const isSharingEnabled = note.shareAccess != null;

  return (
    <Typography aria-label="sharing-status">
      Sharing is {isSharingEnabled ? 'enabled' : 'disabled'}
    </Typography>
  );
}
