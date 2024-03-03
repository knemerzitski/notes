import { useQuery } from '@apollo/client';
import { Alert, Button } from '@mui/material';
import { startTransition, useEffect } from 'react';

import { gql } from '../__generated__/gql';
import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import WidgetListFabLayout from '../components/notes/layout/WidgetListFabLayout';
import { NoteItemProps } from '../components/notes/view/NoteItem';
import useCreateNote from '../graphql/note/hooks/useCreateNote';
import useDeleteNote from '../graphql/note/hooks/useDeleteNote';
import { useProxyNavigate, useProxyRouteTransform } from '../router/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../router/hooks/useAbsoluteLocation';

const QUERY_NOTES = gql(`
  query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {
    notesConnection(last: $last, before: $before) {
      notes {
        id
        title {
          latestText
          latestRevision
        }
        content {
          latestText
          latestRevision
        }
      }
      pageInfo {
        hasPreviousPage
        startCursor
      }
    }
  }
`);

const SUBSCRIPTION_NOTE_CREATED = gql(`
  subscription NotesRouteNoteCreated {
    noteCreated {
      note {
        id
        title {
          latestText
          latestRevision
        }
        content {
          latestText
          latestRevision
        }
      }
    }
  }
`);

// const SUBSCRIPTION_NOTE_UPDATED = gql(`
//   subscription NotesRouteNoteUpdated {
//     noteUpdated {
//       id
//       patch {
//         title
//         content {
//           revision
//           changeset
//         }
//       }
//     }
//   }
// `);

// const SUBSCRIPTION_NOTE_DELETED = gql(`
//   subscription NotesRouteNoteDeleted {
//     noteDeleted {
//       id
//     }
//   }
// `);

function noteRoute(noteId: string) {
  return `/note/${noteId}`;
}

interface NotesRouteProps {
  perPageCount?: number;
}

export default function NotesRoute({ perPageCount = 20 }: NotesRouteProps) {
  const { data, loading, error, fetchMore, subscribeToMore } = useQuery(QUERY_NOTES, {
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

  useEffect(() => {
    subscribeToMore({
      document: SUBSCRIPTION_NOTE_CREATED,
      updateQuery(existing, { subscriptionData }) {
        const { notesConnection } = existing;
        const notes = notesConnection.notes;

        const newNote = subscriptionData.data.noteCreated.note;

        if (notes.some((note) => note.id === newNote.id)) {
          return existing;
        }

        return {
          notesConnection: {
            ...notesConnection,
            notes: [...notes, newNote],
          },
        };
      },
    });

    //   subscribeToMore({
    //     document: SUBSCRIPTION_NOTE_UPDATED,
    //     updateQuery(existing, { subscriptionData }) {
    //       const { notesConnection } = existing;
    //       const notes = notesConnection.notes;

    //       const noteUpdate = subscriptionData.data.noteUpdated;

    //       const existingNoteIndex = notes.findIndex((note) => note.id === noteUpdate.id);

    //       if (existingNoteIndex) {
    //         const existingNote = notes[existingNoteIndex];
    //         const updatedNote = {
    //           ...existingNote,
    //           title: noteUpdate.patch.title ?? existingNote.title,
    //           textContent: noteUpdate.patch.textContent ?? existingNote.textContent,
    //         };
    //         return {
    //           notesConnection: {
    //             ...notesConnection,
    //             notes: [
    //               ...notes.slice(0, existingNoteIndex),
    //               updatedNote,
    //               ...notes.slice(existingNoteIndex + 1),
    //             ],
    //           },
    //         };
    //       } else {
    //         // A note was updated that doesn't exist in cache? Create it.
    //         return {
    //           notesConnection: {
    //             ...notesConnection,
    //             notes: [
    //               ...notes,
    //               {
    //                 id: noteUpdate.id,
    //                 title: noteUpdate.patch.title ?? '',
    //                 textContent: noteUpdate.patch.textContent ?? '',
    //               },
    //             ],
    //           },
    //         };
    //       }
    //     },
    //   });

    //   subscribeToMore({
    //     document: SUBSCRIPTION_NOTE_DELETED,
    //     updateQuery(existing, { subscriptionData }) {
    //       const { notesConnection } = existing;
    //       const notes = notesConnection.notes;

    //       const deletedId = subscriptionData.data.noteDeleted.id;

    //       return {
    //         notesConnection: {
    //           ...notesConnection,
    //           notes: notes.filter((note) => note.id !== deletedId),
    //         },
    //       };
    //     },
    //   });
  }, [subscribeToMore]);

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
    ({ id, title, content }) => ({
      id: String(id),
      title: title.latestText,
      content: content.latestText,
      editing: absoluteLocation.pathname === transform(noteRoute(String(id))),
    })
  );
  // Notes array is ordered by newest at the end
  // Reverse to display newest first
  notes.reverse();

  const pageInfo = data.notesConnection.pageInfo;

  async function handleWidgetNoteCreated(title: string, content: string) {
    if (!(await createNote({ textTitle: title, textContent: content }))) {
      showError('Failed to create note');
      return false;
    }
    return true;
  }

  async function handleFabCreate() {
    const note = await createNote({ textTitle: '', textContent: '' });

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
