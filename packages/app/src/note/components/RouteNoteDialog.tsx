import { useNavigate, useRouter } from '@tanstack/react-router';
import { useState, useCallback } from 'react';

import { OnCloseProvider } from '../../utils/context/on-close';
import { noteEditDialogId } from '../../utils/element-id';
import { useNoteId } from '../context/note-id';

import { useOnNoteNotEditable } from '../hooks/useOnNoteNotEditable';

import { NoteDialog } from './NoteDialog';

/**
 * Note dialog that is based on query search ?noteId=...
 */
export function RouteNoteDialog() {
  const noteId = useNoteId();

  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const router = useRouter();

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  function handleExited() {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, noteId: undefined }),
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
