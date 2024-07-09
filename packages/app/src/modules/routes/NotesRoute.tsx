import { useApolloClient } from '@apollo/client';
import { Alert, Button } from '@mui/material';
import { startTransition, useState } from 'react';

import { NoteCategory } from '../../__generated__/graphql';
import { useSnackbarError } from '../common/components/SnackbarAlertProvider';
import ManageNoteSharingButton from '../note/components/ManageNoteSharingButton';
import { NoteItemProps } from '../note/components/NoteItem';
import WidgetListFabLayout from '../note/components/WidgetListFabLayout';
import NoteContentIdProvider from '../note/context/NoteContentIdProvider';
import { NoteCollabTextEditors } from '../note/context/NoteTextFieldEditorsProvider';
import { useCreatableNoteTextFieldEditors } from '../note/hooks/useCreatableNoteTextFieldEditors';
import useDeleteNote from '../note/hooks/useDeleteNote';
import useDiscardEmptyNote from '../note/hooks/useDiscardEmptyNote';
import useNotesConnection from '../note/hooks/useNotesConnection';
import { insertNoteToNotesConnection } from '../note/policies/Query/notesConnection';
import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../router/context/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../router/hooks/useAbsoluteLocation';

export default function NotesRoute() {
  const apolloClient = useApolloClient();

  const { data, loading, error, fetchMore, canFetchMore } = useNotesConnection({
    perPageCount: 20,
    category: NoteCategory.Default,
  });

  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();
  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const { editors, createNote, reset } = useCreatableNoteTextFieldEditors();
  const [fetchedState, setFetchedState] = useState<{
    note: NonNullable<Awaited<ReturnType<typeof createNote>>>;
    editors: NoteCollabTextEditors;
  } | null>();

  const discardEmptyNote = useDiscardEmptyNote();

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

  function handleFabCreate() {
    startTransition(() => {
      navigate('/note', {
        state: {
          newNote: true,
          autoFocus: true,
        },
      });
    });
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

  async function handleCreateNote() {
    const newNote = await createNote();
    const newEditors = editors;

    setFetchedState((state) => {
      if (state) {
        insertNoteToNotesConnection(apolloClient.cache, state.note);
      }

      if (!newNote) {
        return null;
      }

      return {
        note: newNote,
        editors: newEditors,
      };
    });
  }

  function handleCloseCreateNoteWidget(deleted?: boolean) {
    reset();

    setFetchedState((state) => {
      if (state) {
        if (discardEmptyNote(state)) {
          return null;
        }

        if (!deleted) {
          insertNoteToNotesConnection(apolloClient.cache, state.note);
        }
      }

      return null;
    });
  }

  return (
    <>
      <WidgetListFabLayout
        createNoteWidgetEditor={{
          editors,
        }}
        createNoteWidget={{
          onCreate: () => {
            void handleCreateNote();
          },
          onClose: handleCloseCreateNoteWidget,
          slots: {
            toolbar: (
              <NoteContentIdProvider noteContentId={fetchedState?.note.contentId}>
                <ManageNoteSharingButton />
              </NoteContentIdProvider>
            ),
          },
          moreOptionsButtonProps: {
            onDelete() {
              if (!fetchedState) return;
              handleDelete(fetchedState.note.contentId);
            },
          },
        }}
        notesList={{
          loading,
          notes,
          onStartEdit: handleStartEdit,
          onDelete: handleDelete,
        }}
        createNoteFab={{
          onCreate: handleFabCreate,
        }}
      />
      {canFetchMore && <Button onClick={() => void fetchMore()}>Fetch More</Button>}
    </>
  );
}
