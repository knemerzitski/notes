import { useQuery } from '@apollo/client';
import { Alert, Button } from '@mui/material';
import { startTransition, useEffect } from 'react';

import { gql } from '../__generated__/gql';
import { NoteTextField } from '../__generated__/graphql';
import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import { useModifyActiveNotes } from '../note/collab/context/ActiveNotesProvider';
import WidgetListFabLayout from '../note/components/layout/WidgetListFabLayout';
import { NoteItemProps } from '../note/components/view/NoteItem';
import useCreateNote from '../note/hooks/useCreateNote';
import useDeleteNote from '../note/hooks/useDeleteNote';
import { useProxyNavigate, useProxyRouteTransform } from '../router/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../router/hooks/useAbsoluteLocation';
import { useIsBackgroundLocation } from '../router/hooks/useIsBackgroundLocation';

const QUERY_NOTES = gql(`
  query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {
    notesConnection(last: $last, before: $before) {
      notes {
        id
        textFields {
          key
          value {
            viewText @client
            headText
            headRevision
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

function noteRoute(noteId: string) {
  return `/note/${noteId}`;
}

interface NotesRouteProps {
  perPageCount?: number;
}

export default function NotesRoute({ perPageCount = 20 }: NotesRouteProps) {
  // TODO fix notes list should not update with editing a note
  const isBackgroundLocation = useIsBackgroundLocation();

  const {
    data,
    loading: fetchLoading,
    error,
    fetchMore,
  } = useQuery(QUERY_NOTES, {
    variables: {
      last: perPageCount,
    },
    nextFetchPolicy: isBackgroundLocation ? 'standby' : 'cache-first',
  });

  const loading = fetchLoading && !data;

  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();
  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const activeNotes = useModifyActiveNotes();

  useEffect(() => {
    data?.notesConnection.notes.forEach(({ id }) => {
      activeNotes.add(id);
    });
  }, [activeNotes, data?.notesConnection.notes]);

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

  const notes: NoteItemProps['note'][] = data.notesConnection.notes.map(
    ({ id, textFields }) => {
      const title =
        textFields.find(({ key }) => key === NoteTextField.Title)?.value.viewText ?? '';
      const content =
        textFields.find(({ key }) => key === NoteTextField.Content)?.value.viewText ?? '';

      return {
        id: String(id),
        title: title,
        content: content,
        editing: absoluteLocation.pathname === transform(noteRoute(String(id))),
      };
    }
  );

  // Notes array is ordered by newest at the end
  // Reverse to display newest first
  notes.reverse();

  const pageInfo = data.notesConnection.pageInfo;

  async function handleWidgetNoteCreated(title: string, content: string) {
    if (
      !(await createNote({
        textFields: [
          {
            key: NoteTextField.Title,
            value: {
              initialText: title,
            },
          },
          {
            key: NoteTextField.Content,
            value: {
              initialText: content,
            },
          },
        ],
      }))
    ) {
      showError('Failed to create note');
      return false;
    }
    return true;
  }

  async function handleFabCreate() {
    const note = await createNote({});

    if (!note) {
      showError('Failed to create note');
      return;
    }

    startTransition(() => {
      navigate(noteRoute(String(note.id)), {
        state: {
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
  return (
    <>
      <WidgetListFabLayout
        slotProps={{
          createNoteWidget: {
            onCreated: handleWidgetNoteCreated,
          },
          notesList: {
            loading,
            notes,
            onStartEdit: handleStartEdit,
            onDelete: handleDelete,
          },
          createNoteFab: {
            onCreate: handleFabCreate,
          },
        }}
      />
      {pageInfo.hasPreviousPage && (
        <Button onClick={() => void handleFetchMore()}>Fetch More</Button>
      )}
    </>
  );
}
