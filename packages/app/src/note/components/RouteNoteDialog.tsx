import { useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { OnCloseProvider } from '../../utils/context/on-close';
import { NoteIdProvider } from '../context/note-id';
import { NoteDialog } from './NoteDialog';
import { useOnNoteNotEditable } from '../hooks/useOnNoteNotEditable';

/**
 * Note dialog that is based on query search ?noteId=...
 */
export function RouteNoteDialog({ noteId }: { noteId: string }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  function handleExited() {
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, noteId: undefined }),
    });
  }

  // Close dialog when note can no longer be edited
  useOnNoteNotEditable(noteId, () => {
    handleClose();
  });

  return (
    <NoteIdProvider noteId={noteId}>
      <OnCloseProvider onClose={handleClose}>
        <NoteDialog open={open} onClose={handleClose} onTransitionExited={handleExited} />
      </OnCloseProvider>
    </NoteIdProvider>
  );
}
