import { startTransition, useEffect, useRef } from 'react';
import { useProxyNavigate, useProxyRouteTransform } from '../router/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../router/hooks/useAbsoluteLocation';
import { useIsBackgroundLocation } from '../router/hooks/useIsBackgroundLocation';
import isDefined from '~utils/type-guards/isDefined';
import usePauseableQuery from '../apollo-client/hooks/usePauseableQuery';
import { Alert, Button } from '@mui/material';
import { useApolloClient } from '@apollo/client';
import { NoteTextField } from '../../__generated__/graphql';
import { useSnackbarError } from '../common/components/SnackbarAlertProvider';
import { NoteItemProps } from '../note/components/NoteItem';
import WidgetListFabLayout from '../note/components/WidgetListFabLayout';
import { useCreatableNoteTextFieldEditors } from '../note/hooks/useCreatableNoteTextFieldEditors';
import useDeleteNote from '../note/hooks/useDeleteNote';
import { insertNoteToNotesConnection } from '../note/update-query';
import { gql } from '../../__generated__/gql';
import { addActiveNotes } from '../note/active-notes';

const QUERY_NOTES = gql(`
  query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {
    notesConnection(last: $last, before: $before) {
      notes {
        id
        contentId
        isOwner
        textFields {
          key
          value {
            id
            headText {
              revision
              changeset
            }
            viewText @client
          }
        }
      }
      pageInfo {
        hasPreviousPage
        startCursor
      }
    }
  }
`);

interface NotesRouteProps {
  perPageCount?: number;
}

function noteRoute(noteId: string) {
  return `/note/${noteId}`;
}

export default function NotesRoute({ perPageCount = 20 }: NotesRouteProps) {
  const apolloClient = useApolloClient();
  const isBackgroundLocation = useIsBackgroundLocation();

  const {
    data,
    loading: fetchLoading,
    error,
    fetchMore,
  } = usePauseableQuery(isBackgroundLocation, QUERY_NOTES, {
    variables: {
      last: perPageCount,
    },
  });

  const loading = fetchLoading && !data;

  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();
  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const { editors, createNote, reset } = useCreatableNoteTextFieldEditors();
  const createdNoteRef = useRef<NonNullable<
    Awaited<ReturnType<typeof createNote>>
  > | null>();

  useEffect(() => {
    const notes = data?.notesConnection.notes;
    if (notes) {
      addActiveNotes(apolloClient.cache, data.notesConnection.notes.filter(isDefined));
    }
  }, [apolloClient, data]);

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  if (!data) {
    return <></>;
  }

  const notes: NoteItemProps['note'][] = data.notesConnection.notes
    .filter(isDefined)
    .map(({ contentId, textFields }) => {
      const title =
        textFields.find(({ key }) => key === NoteTextField.Title)?.value.viewText ?? '';
      const content =
        textFields.find(({ key }) => key === NoteTextField.Content)?.value.viewText ?? '';

      return {
        id: contentId,
        title: title,
        content: content,
        editing: absoluteLocation.pathname === transform(noteRoute(contentId)),
      };
    });

  // Notes array is ordered by newest at the end
  // Reverse to display newest first
  notes.reverse();

  const pageInfo = data.notesConnection.pageInfo;

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
      navigate(noteRoute(noteId));
    });
  }

  async function handleDelete(id: string) {
    if (!(await deleteNote(id))) {
      showError('Failed to delete note');
      return false;
    }
    return true;
  }

  async function handleFetchMore() {
    await fetchMore({
      variables: {
        last: perPageCount,
        before: pageInfo.startCursor,
      },
      // Merge result to existing
      updateQuery(previousResult, { fetchMoreResult }) {
        return {
          notesConnection: {
            ...fetchMoreResult.notesConnection,
            notes: [
              ...fetchMoreResult.notesConnection.notes,
              ...previousResult.notesConnection.notes,
            ],
            pageInfo: fetchMoreResult.notesConnection.pageInfo,
          },
        };
      },
    });
  }

  async function handleCreateNote() {
    const newNote = await createNote();
    if (createdNoteRef.current) {
      insertNoteToNotesConnection(apolloClient.cache, createdNoteRef.current);
    }
    createdNoteRef.current = newNote;
  }

  function handleCloseCreateNoteWidget() {
    reset();
    if (createdNoteRef.current) {
      insertNoteToNotesConnection(apolloClient.cache, createdNoteRef.current);
    }
    createdNoteRef.current = null;
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
      {pageInfo.hasPreviousPage && (
        <Button onClick={() => void handleFetchMore()}>Fetch More</Button>
      )}
    </>
  );
}
