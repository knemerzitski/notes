import { Alert } from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../components/feedback/RouteClosable';
import CollabEditor from '../../../note/collab/components/CollabEditor';
import { useModifyActiveNotes } from '../../../note/collab/context/ActiveNotesProvider';
import NoteIdProvider from '../../../note/collab/context/NoteIdProvider';
import NoteDialog from '../../../note/components/NoteDialog';
import useDeleteNote from '../../../note/hooks/useDeleteNote';

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const deleteNote = useDeleteNote();
  const activeNotes = useModifyActiveNotes();
  const params = useParams<'id'>();
  const noteId = params.id;

  useEffect(() => {
    if (noteId) {
      activeNotes.add(noteId);
    }
  }, [activeNotes, noteId]);

  async function handleDeleteNote() {
    if (!noteId) return false;
    return deleteNote(noteId);
  }

  return (
    <NoteDialog open={open} onClose={onClosing} onTransitionExited={onClosed}>
      {noteId ? (
        <NoteIdProvider noteId={noteId}>
          <CollabEditor
            toolbarProps={{
              onClose: onClosing,
              onDelete: handleDeleteNote,
            }}
          />
        </NoteIdProvider>
      ) : (
        <Alert severity="error" elevation={0}>
          Empty note id
        </Alert>
      )}
    </NoteDialog>
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
