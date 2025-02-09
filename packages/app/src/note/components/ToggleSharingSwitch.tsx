import { useFragment } from '@apollo/client';
import { Switch } from '@mui/material';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { useDeleteShareNote } from '../hooks/useDeleteShareNote';
import { useIsCreatingShareLink } from '../hooks/useIsCreatingShareLink';
import { useShareNote } from '../hooks/useShareNote';

const ToggleSharingSwitch_NoteFragment = gql(`
  fragment ToggleSharingSwitch_NoteFragment on Note {
    id
    shareAccess {
      id
    }
  }
`);

export function ToggleSharingSwitch() {
  const shareNote = useShareNote();
  const deleteShareNote = useDeleteShareNote();

  const noteId = useNoteId();
  const { complete, data: note } = useFragment({
    fragment: ToggleSharingSwitch_NoteFragment,
    from: {
      __typename: 'Note',
      id: noteId,
    },
  });

  const isCreatingShareLink = useIsCreatingShareLink(noteId);
  const isSharingEnabled = note.shareAccess != null;

  function handleToggleSharing() {
    if (!isSharingEnabled) {
      void shareNote({
        noteId,
      });
    } else {
      void deleteShareNote({
        noteId,
      });
    }
  }

  return (
    <Switch
      aria-label={isSharingEnabled ? 'delete share link' : 'create share link'}
      disabled={!complete || isCreatingShareLink}
      checked={isSharingEnabled || isCreatingShareLink}
      onChange={handleToggleSharing}
    />
  );
}
