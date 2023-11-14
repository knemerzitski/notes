import { useQuery } from '@apollo/client';
import { Alert, Skeleton } from '@mui/material';
import Grid, { GridProps } from '@mui/material/Grid';

import { Note } from '../__generated__/graphql';
import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';

import NoteItem from './NoteItem';
import GET_NOTES from './graphql/GET_NOTES';
import useDeleteNote from './graphql/useDeleteNote';

export default function NotesList(props: GridProps) {
  const { data: notesData, loading, error } = useQuery(GET_NOTES);

  const deleteNote = useDeleteNote();

  const showError = useSnackbarError();

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  const notes: Note[] = notesData?.notes ?? [];

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
