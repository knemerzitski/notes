import { useQuery } from '@apollo/client';
import { Alert, Button } from '@mui/material';
import { startTransition } from 'react';

import { gql } from '../__generated__/gql';
import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import WidgetListFabLayout from '../components/notes/layout/WidgetListFabLayout';
import { NoteItemProps } from '../components/notes/view/NoteItem';
import useCreateNote from '../graphql/note/hooks/useCreateNote';
import useDeleteNote from '../graphql/note/hooks/useDeleteNote';
import { useProxyNavigate, useProxyRouteTransform } from '../router/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../router/hooks/useAbsoluteLocation';

const QUERY = gql(`
  query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {
    notesConnection(last: $last, before: $before) {
      notes {
        id
        title
        textContent
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
  perPageCount?: 2;
}

export default function NotesRoute({ perPageCount = 2 }: NotesRouteProps) {
  const {
    data,
    loading,
    error,
    fetchMore,
    // subscribeToMore,
  } = useQuery(QUERY, {
    variables: {
      last: perPageCount,
    },
  });

  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();
  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  // useEffect(() => {
  //   subscribeToMore({
  //     document: NOTE_CREATED,
  //     updateQuery(cache, { subscriptionData }) {
  //       let { notes } = cache;
  //       if (!notes) notes = [];

  //       const newNote = subscriptionData.data.noteCreated;

  //       if (notes.some((cachedNote) => cachedNote.id === newNote.id)) {
  //         return cache;
  //       }

  //       return {
  //         notes: [newNote, ...notes],
  //       };
  //     },
  //   });

  //   subscribeToMore({
  //     document: NOTE_UPDATED,
  //     updateQuery(cache, { subscriptionData }) {
  //       let { notes } = cache;
  //       if (!notes) notes = [];

  //       const updatedNote = subscriptionData.data.noteUpdated;

  //       return {
  //         notes: notes.map((cachedNote) =>
  //           cachedNote.id === updatedNote.id ? updatedNote : cachedNote
  //         ),
  //       };
  //     },
  //   });

  //   subscribeToMore({
  //     document: NOTE_DELETED,
  //     updateQuery(cache, { subscriptionData }) {
  //       let { notes } = cache;
  //       if (!notes) notes = [];

  //       const deletedId = subscriptionData.data.noteDeleted;

  //       return {
  //         notes: notes.filter((cachedNote) => cachedNote.id !== deletedId),
  //       };
  //     },
  //   });
  // }, [subscribeToMore]);

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
    ({ id, title, textContent }) => ({
      id: String(id),
      title,
      content: textContent,
      editing: absoluteLocation.pathname === transform(noteRoute(String(id))),
    })
  );
  // Notes array is ordered by newest at the end
  // Reverse to display newest first
  notes.reverse();

  const pageInfo = data.notesConnection.pageInfo;

  async function handleWidgetNoteCreated(title: string, content: string) {
    if (!(await createNote(title, content))) {
      showError('Failed to create note');
      return false;
    }
    return true;
  }

  async function handleFabCreate() {
    const note = await createNote('', '');

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
            slotProps: {
              contentField: {
                placeholder: 'Take a local note...',
              },
            },
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
