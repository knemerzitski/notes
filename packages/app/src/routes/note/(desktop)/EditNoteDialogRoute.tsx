import { Alert } from '@mui/material';
import { useParams } from 'react-router-dom';

import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../components/feedback/RouteClosable';
import CollabNoteEditor from '../../../note/components/edit/CollabNoteEditor';
import NoteContentIdProvider from '../../../note/context/NoteContentIdProvider';
import NoteDialog from '../../../note/components/NoteDialog';
import useDeleteNote from '../../../note/hooks/useDeleteNote';

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const deleteNote = useDeleteNote();
  const params = useParams<'id'>();
  const noteId = params.id;

  async function handleDeleteNote() {
    if (!noteId) return false;
    return deleteNote(noteId);
  }

  return (
    <NoteDialog open={open} onClose={onClosing} onTransitionExited={onClosed}>
      {noteId ? (
        <NoteContentIdProvider noteContentId={noteId}>
          <CollabNoteEditor
            toolbarProps={{
              onClose: onClosing,
              toolbarProps: {
                moreOptionsButtonProps: {
                  onDelete: handleDeleteNote,
                },
              },
            }}
          />
        </NoteContentIdProvider>
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
