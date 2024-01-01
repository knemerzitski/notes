import { useQuery } from '@apollo/client';
import { Alert, Skeleton } from '@mui/material';
import Grid, { GridProps } from '@mui/material/Grid';
// import { useEffect } from 'react';

import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import { Note } from '../graphql/__generated__/graphql';
import GET_NOTES from '../graphql/note/documents/GET_NOTES';
// import NOTE_CREATED from '../schema/note/documents/NOTE_CREATED';
// import NOTE_DELETED from '../schema/note/documents/NOTE_DELETED';
// import NOTE_UPDATED from '../schema/note/documents/NOTE_UPDATED';
import useDeleteNote from '../graphql/note/hooks/useDeleteNote';

import NoteItem from './NoteItem';

export default function NotesList(props: GridProps) {
  const {
    data: notesData,
    loading,
    error,
    // subscribeToMore,
  } = useQuery(GET_NOTES(), {
    variables: {
      first: 20,
    },
  });

  const deleteNote = useDeleteNote();

  const showError = useSnackbarError();

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

  const notes: Note[] =
    notesData?.userNotesConnection.notes.map((note) => note.note) ?? [];

  async function handleDelete(id: string): Promise<boolean> {
    if (!(await deleteNote(id))) {
      showError('Failed to delete note');
      return false;
    }
    return true;
  }

  return (
    <Grid container justifyContent="center" spacing={{ xs: 1, md: 2 }} {...props}>
      {loading
        ? [...Array(15).keys()].map((index) => (
            <Grid
              item
              key={index}
              sx={{
                width: {
                  xs: '100%',
                  sm: 'min(256px,100%)',
                },
              }}
            >
              <Skeleton
                width="inherit"
                height={384}
                variant="rounded"
                animation="wave"
              ></Skeleton>
            </Grid>
          ))
        : notes.map((note) => (
            <Grid
              item
              key={note.id}
              sx={{
                width: {
                  xs: '100%',
                  sm: 'min(256px,100%)',
                },
              }}
            >
              <NoteItem
                note={note}
                onDelete={() => handleDelete(note.id)}
                sx={{
                  width: 'inherit',
                  height: '100%',
                }}
              />
            </Grid>
          ))}
    </Grid>
  );
}
