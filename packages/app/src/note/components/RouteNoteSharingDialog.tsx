import { useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { OnCloseProvider } from '../../utils/context/on-close';
import { NoteIdProvider } from '../context/note-id';
import { noteSharingDialogId } from '../../utils/element-id';
import { NoteSharingDialog } from './NoteSharingDialog';
import { useOnNoteNotEditable } from '../hooks/useOnNoteNotEditable';
import { gql } from '../../__generated__';

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

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  function handleExited() {
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, sharingNoteId: undefined }),
    });
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
