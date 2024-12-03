import { useFragment } from '@apollo/client';
import { Button } from '@mui/material';

import { useId } from 'react';

import { gql } from '../../__generated__';
import { useShowSnackbarAlert } from '../../utils/context/snackbar-alert';
import { useNoteId } from '../context/note-id';
import { getShareUrl } from '../utils/get-share-url';

const SharingCopyLinkButton_NoteFragment = gql(`
  fragment SharingCopyLinkButton_NoteFragment on Note {
    id
    shareAccess {
      id
    }
  }
`);

export function SharingCopyLinkButton() {
  const id = useId();
  const showSnackbarAlert = useShowSnackbarAlert();

  const noteId = useNoteId();
  const { data: note } = useFragment({
    fragment: SharingCopyLinkButton_NoteFragment,
    from: {
      __typename: 'Note',
      id: noteId,
    },
  });

  const isSharingEnabled = note.shareAccess != null;

  function handleCopyLink() {
    const shareId = note.shareAccess?.id;
    if (!shareId) {
      return;
    }
    const shareUrl = getShareUrl(shareId);
    void navigator.clipboard.writeText(shareUrl).then(() => {
      showSnackbarAlert({
        modalOptions: {
          key: id,
          maxShowCount: 1,
        },
        AlertProps: {
          severity: 'success',
          children: 'Link copied',
        },
        SnackbarProps: {
          autoHideDuration: 5000,
        },
      });
    });
  }

  return (
    <Button variant="contained" disabled={!isSharingEnabled} onClick={handleCopyLink}>
      Copy link
    </Button>
  );
}
