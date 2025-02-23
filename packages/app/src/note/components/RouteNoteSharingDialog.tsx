import { useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';

import { gql } from '../../__generated__';
import { router } from '../../router';
import { useGetCanGoBack } from '../../router/context/get-can-go-back';
import { OnCloseProvider } from '../../utils/context/on-close';
import { noteSharingDialogId } from '../../utils/element-id';
import { NoteIdProvider } from '../context/note-id';

import { useOnNoteNotEditable } from '../hooks/useOnNoteNotEditable';

import { NoteSharingDialog } from './NoteSharingDialog';

const _RouteNoteSharingDialog_NoteFragment = gql(`
  fragment RouteNoteSharingDialog_NoteFragment on Note {
    ...NoteSharingDialog_NoteFragment
  }
`);

/**
 * Note dialog that is based on query search ?sharingNoteId=...
 */
export function RouteNoteSharingDialog({ noteId }: { noteId: string }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const getCanGoBack = useGetCanGoBack();

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  function handleExited() {
    if (getCanGoBack()) {
      router.history.back();
    } else {
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, sharingNoteId: undefined }),
        replace: true,
      });
    }
  }

  // Close dialog when note can no longer be edited
  useOnNoteNotEditable(noteId, () => {
    handleClose();
  });

  return (
    <NoteIdProvider noteId={noteId}>
      <OnCloseProvider onClose={handleClose}>
        <NoteSharingDialog
          open={open}
          onClose={handleClose}
          onTransitionExited={handleExited}
          PaperProps={{
            id: noteSharingDialogId(noteId),
          }}
        />
      </OnCloseProvider>
    </NoteIdProvider>
  );
}
