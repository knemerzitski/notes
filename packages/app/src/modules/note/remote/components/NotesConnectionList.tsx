import { Alert, Button } from '@mui/material';
import { ReactNode, startTransition } from 'react';

import { useSnackbarError } from '../../../common/components/SnackbarAlertProvider';
import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../../../router/context/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../../../router/hooks/useAbsoluteLocation';
import { NoteCardItemProps } from '../../base/components/NoteCardItem';
import NotesCardList from '../../base/components/NotesCardList';
import NoteContentIdProvider from '../context/NoteContentIdProvider';
import useDeleteNote from '../hooks/useDeleteNote';
import useNotesConnection, {
  UseNotesConnectionOptions,
} from '../hooks/useNotesConnection';

import ArchiveOrUnarchiveNoteButton from './ArchiveOrUnarchiveNoteButton';
import ManageNoteSharingButton from './ManageNoteSharingButton';

interface NotesConnectionListProps {
  notesConnectionOptions?: UseNotesConnectionOptions;
  /**
   * Render this node when list is empty
   */
  emptyRender?: ReactNode;
}

export default function NotesConnectionList({
  notesConnectionOptions,
  emptyRender,
}: NotesConnectionListProps) {
  const { data, loading, error, fetchMore, canFetchMore } =
    useNotesConnection(notesConnectionOptions);

  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();
  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  const notes: NoteCardItemProps['note'][] =
    data?.notes.map(({ contentId, textFields, isOwner, sharing }) => ({
      id: contentId,
      title: textFields.TITLE.viewText,
      content: textFields.CONTENT.viewText,
      // TODO for editing compare pathname make a hook and do it in note?
      editing: absoluteLocation.pathname === transform(`/note/${contentId}`),
      type: !isOwner ? 'linked' : sharing ? 'shared' : undefined,
      slots: {
        toolbar: (
          <NoteContentIdProvider noteContentId={contentId}>
            <ManageNoteSharingButton />
            <ArchiveOrUnarchiveNoteButton />
          </NoteContentIdProvider>
        ),
      },
    })) ?? [];

  if (notes.length === 0 && emptyRender) {
    return emptyRender;
  }

  function handleStartEdit(noteId: string) {
    startTransition(() => {
      navigate(`/note/${noteId}`);
    });
  }

  function handleDelete(id: string) {
    void deleteNote(id).then((deleted) => {
      if (!deleted) {
        showError('Failed to delete note');
      }
    });
  }

  return (
    <>
      <NotesCardList
        loading={loading}
        notes={notes}
        onStartEdit={handleStartEdit}
        onDelete={handleDelete}
      />
      {/* // TODO implement infinite loading with a limit? */}
      {canFetchMore && <Button onClick={() => void fetchMore()}>Fetch More</Button>}
    </>
  );
}
