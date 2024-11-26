import { useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { NoteCategory } from '../../__generated__/graphql';
import { OnCloseProvider } from '../../utils/context/on-close';
import { NoteIdProvider } from '../context/note-id';
import { useCategoryChanged } from '../hooks/useCategoryChanged';
import { NoteDialog } from './NoteDialog';

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: (prev: any) => ({ ...prev, noteId: undefined }),
    });
  }

  useCategoryChanged(noteId, (categoryName) => {
    const isNoteDeleted = categoryName === false;
    if (isNoteDeleted || categoryName === NoteCategory.TRASH) {
      handleClose();
    }
  });

  return (
    <NoteIdProvider noteId={noteId}>
      <OnCloseProvider onClose={handleClose}>
        <NoteDialog open={open} onClose={handleClose} onTransitionExited={handleExited} />
      </OnCloseProvider>
    </NoteIdProvider>
  );
}
