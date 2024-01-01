import { useSuspenseQuery } from '@apollo/client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppBar, Box, IconButton, Paper, Toolbar } from '@mui/material';
// import { useEffect } from 'react';
import { useParams, useLocation, Location } from 'react-router-dom';

import { useSnackbarError } from '../../feedback/SnackbarAlertProvider';
import { Note } from '../../graphql/__generated__/graphql';
import GET_NOTE from '../../graphql/note/operations/GET_NOTE';
import useDeleteNote from '../../graphql/note/hooks/useDeleteNote';
import useUpdateNote from '../../graphql/note/hooks/useUpdateNote';
import useIsScrollEnd from '../../hooks/useIsScrollEnd';
import BorderlessTextField from '../../inputs/BorderlessTextField';
import NoteToolbar from '../../notes/NoteToolbar';
import { useProxyNavigate } from '../ProxyRoutesProvider';

// import NOTE_UPDATED from '../../schema/note/documents/NOTE_UPDATED';

export default function EditNotePage() {
  const params = useParams<'id'>();
  const navigate = useProxyNavigate();

  const location = useLocation() as Location<{ autoFocus?: unknown } | undefined>;

  const showError = useSnackbarError();

  const isScrollEnd = useIsScrollEnd();

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const { data /* , subscribeToMore */ } = useSuspenseQuery(GET_NOTE(), {
    variables: {
      id: params.id ?? '',
    },
  });

  // useEffect(() => {
  //   subscribeToMore({
  //     document: NOTE_UPDATED,
  //     updateQuery(_cache, { subscriptionData }) {
  //       const updatedNote = subscriptionData.data.noteUpdated;
  //       return {
  //         note: updatedNote,
  //       };
  //     },
  //   });
  // }, [subscribeToMore]);

  const note = data.userNote.note;

  const autoFocus = Boolean(location.state?.autoFocus);

  async function handleNoteChange(updatedNote: Omit<Note, 'id'>) {
    if (
      !(await updateNote({
        id: note.id,
        title: updatedNote.title,
        textContent: updatedNote.textContent,
      }))
    ) {
      showError('Failed to update note');
    }
  }

  async function handleDeleteNote() {
    if (!(await deleteNote(note.id))) {
      showError('Failed to delete note');
      return false;
    }

    navigate('/');
    return true;
  }

  function handleClickBack() {
    navigate(-1);
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar
        elevation={0}
        sx={{
          borderBottom: 'none',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back to all notes"
            size="large"
            onClick={handleClickBack}
          >
            <ArrowBackIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Toolbar />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            p: 2,
            pb: 1,
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <BorderlessTextField
            placeholder="Title"
            fullWidth
            value={note.title}
            onChange={(e) => {
              void handleNoteChange({
                ...note,
                title: e.target.value,
              });
            }}
            sx={{
              '.MuiInputBase-root': {
                fontWeight: (theme) => theme.typography.fontWeightMedium,
                fontSize: '1.4em',
              },
            }}
          />
          <BorderlessTextField
            placeholder="Note"
            fullWidth
            multiline
            autoFocus={autoFocus}
            value={note.textContent}
            onChange={(e) => {
              void handleNoteChange({
                ...note,
                textContent: e.target.value,
              });
            }}
            sx={{
              flexGrow: 1,
            }}
          />
        </Box>

        <Paper
          elevation={0}
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'row',
            borderRadius: 0,
            boxShadow: isScrollEnd ? 0 : 5,
            transition: (theme) =>
              theme.transitions.create('box-shadow', {
                duration: theme.transitions.duration.shortest,
                easing: theme.transitions.easing.sharp,
              }),
          }}
        >
          <NoteToolbar
            slots={{
              moreOptionsButton: {
                onDelete: handleDeleteNote,
              },
            }}
            sx={{
              flexGrow: 1,
              p: 1,
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
}
