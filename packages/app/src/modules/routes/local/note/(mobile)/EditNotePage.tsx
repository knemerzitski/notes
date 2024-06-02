import { useParams } from 'react-router-dom';

import {
  AppBar as MuiAppBar,
  Box,
  IconButton,
  Toolbar as MuiToolbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import useDeleteLocalNote from '../../../../note-local/hooks/useDeleteLocalNote';
import useIsScrollEnd from '../../../../common/hooks/useIsScrollEnd';
import usePreviousLocation from '../../../../router/hooks/usePreviousLocation';
import { useProxyNavigate } from '../../../../router/context/ProxyRoutesProvider';
import { useEffect } from 'react';
import useLocalNoteExists from '../../../../note-local/hooks/useLocalNoteExists';
import AppBar from '../../../../common/components/AppBar';
import { LocalNoteEditingContext } from '../../../../note-local/context/LocalNoteEditingContext';
import CollabInputs from '../../../../note/components/CollabInputs';
import UndoButton from '../../../../note/components/UndoButton';
import RedoButton from '../../../../note/components/RedoButton';
import MoreOptionsButton from '../../../../note/components/MoreOptionsButton';

export type EditNoteLocationState = null | { newNote?: boolean; autoFocus?: boolean };

export default function EditNotePage() {
  const deleteNote = useDeleteLocalNote();
  const params = useParams<'id'>();
  const localNoteId = params.id;
  const previousLocation = usePreviousLocation();
  const isScrollEnd = useIsScrollEnd();
  const navigate = useProxyNavigate();

  const noteExists = useLocalNoteExists(localNoteId ?? '');

  async function handleDeleteNote() {
    if (!localNoteId) return false;

    deleteNote(localNoteId);

    // TODO close
    if (previousLocation) {
      navigate(-1);
    } else {
      navigate('/');
    }

    return Promise.resolve(true);
  }

  useEffect(() => {
    if (!localNoteId) {
      if (previousLocation) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  }, [localNoteId, previousLocation, navigate]);

  if (!localNoteId) {
    return null;
  }

  if (!noteExists) {
    return <Alert severity="error">{`Local note '${localNoteId}' not found`}</Alert>;
  }

  function handleClickBack() {
    if (previousLocation) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }
  const buttonSize = 'medium';

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar>
        <MuiToolbar
          sx={{
            justifyContent: 'space-between',
            // Temporary fix for layout shift for "interactive-widget=resizes-content" when title field is focused
            height: '56px',
          }}
        >
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back to all notes"
            size="large"
            onClick={handleClickBack}
          >
            <ArrowBackIcon />
          </IconButton>
        </MuiToolbar>
      </AppBar>

      <MuiToolbar sx={{ height: '56px' }} />

      <LocalNoteEditingContext localNoteId={localNoteId}>
        <>
          <CollabInputs
            boxProps={{
              sx: {
                flexGrow: 1,
                mb: '56px',
              },
            }}
            contentProps={{
              inputProps: {
                sx: {
                  '.MuiInputBase-input': {
                    alignSelf: 'flex-start',
                  },
                },
              },
            }}
          />

          <MuiAppBar
            elevation={0}
            position="fixed"
            sx={{
              ...(!isScrollEnd && {
                boxShadow: (theme) => theme.shadowsNamed.scrollEnd,
              }),
              top: 'auto',
              bottom: 0,
            }}
          >
            <MuiToolbar
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                // Temporary fix for layout shift for "interactive-widget=resizes-content" when title field is focused
                height: '56px',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                }}
              >
                <UndoButton
                  iconButtonProps={{
                    edge: 'start',
                    size: buttonSize,
                  }}
                />
                <RedoButton
                  iconButtonProps={{
                    edge: 'end',
                    size: buttonSize,
                  }}
                />
              </Box>
              <MoreOptionsButton
                onDelete={handleDeleteNote}
                iconButtonProps={{
                  edge: 'end',
                  size: buttonSize,
                }}
              />
            </MuiToolbar>
          </MuiAppBar>
        </>
      </LocalNoteEditingContext>
    </Box>
  );
}
