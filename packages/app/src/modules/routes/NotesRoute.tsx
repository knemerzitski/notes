import { Alert, Button } from '@mui/material';
import { startTransition } from 'react';

import { NoteCategory } from '../../__generated__/graphql';
import IsDesktop from '../common/components/IsDesktop';
import IsMobile from '../common/components/IsMobile';
import { useSnackbarError } from '../common/components/SnackbarAlertProvider';
import CreateNoteFab from '../note/remote/components/CreateNoteFab';
import CreateNoteWidget from '../note/remote/components/CreateNoteWidget';
import ManageNoteSharingButton from '../note/remote/components/ManageNoteSharingButton';
import { NoteItemProps } from '../note/remote/components/NoteItem';
import NotesList from '../note/remote/components/NotesList';
import NoteContentIdProvider from '../note/remote/context/NoteContentIdProvider';
import useDeleteNote from '../note/remote/hooks/useDeleteNote';
import useNotesConnection from '../note/remote/hooks/useNotesConnection';
import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../router/context/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../router/hooks/useAbsoluteLocation';

export default function NotesRoute() {
  const { data, loading, error, fetchMore, canFetchMore } = useNotesConnection({
    perPageCount: 20,
    category: NoteCategory.Default,
  });

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

  const notes: NoteItemProps['note'][] =
    data?.notes.map(({ contentId, textFields, isOwner, sharing }) => {
      return {
        id: contentId,
        title: textFields.TITLE.viewText,
        content: textFields.CONTENT.viewText,
        editing: absoluteLocation.pathname === transform(`/note/${contentId}`),
        type: !isOwner ? 'linked' : sharing ? 'shared' : undefined,
        slots: {
          toolbar: (
            <NoteContentIdProvider noteContentId={contentId}>
              <ManageNoteSharingButton />
            </NoteContentIdProvider>
          ),
        },
      };
    }) ?? [];

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
      <IsDesktop>
        <CreateNoteWidget />
      </IsDesktop>

      <NotesList
        {...{ loading, notes, onStartEdit: handleStartEdit, onDelete: handleDelete }}
      />
      {canFetchMore && <Button onClick={() => void fetchMore()}>Fetch More</Button>}

      <IsMobile>
        <CreateNoteFab />
      </IsMobile>
    </>
  );
}
