import { useNavigate, useRouter } from '@tanstack/react-router';
import { useState, useCallback } from 'react';

import { gql } from '../../__generated__';
import { useGetCanGoBack } from '../../router/context/get-can-go-back';
import { OnCloseProvider } from '../../utils/context/on-close';
import { noteEditDialogId } from '../../utils/element-id';
import { useNoteId } from '../context/note-id';

import { useOnNoteNotEditable } from '../hooks/useOnNoteNotEditable';

import { NoteDialog } from './NoteDialog';

const _RouteNoteDialog_NoteFragment = gql(`
  fragment RouteNoteDialog_NoteFragment on Note {
    ...NoteDialog_NoteFragment
  }
`);

/**
 * Note dialog that is based on query search ?noteId=...
 */
export function RouteNoteDialog() {
  const noteId = useNoteId();

  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const router = useRouter();
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
        search: (prev) => ({ ...prev, noteId: undefined }),
        replace: true,
      });
    }
  }

  // Close dialog when note can no longer be edited
  useOnNoteNotEditable(noteId, () => {
    handleClose();
  });

  return (
    <OnCloseProvider onClose={handleClose}>
      <NoteDialog
        open={open}
        onClose={handleClose}
        onTransitionExited={handleExited}
        PaperProps={{
          id: noteEditDialogId(noteId),
        }}
      />
    </OnCloseProvider>
  );
}
