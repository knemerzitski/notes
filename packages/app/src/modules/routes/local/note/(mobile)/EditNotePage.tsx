
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  AppBar as MuiAppBar,
  Box,
  IconButton,
  Toolbar as MuiToolbar,
  Alert,
} from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import AppBar from '../../../../common/components/AppBar';
import useIsScrollEnd from '../../../../common/hooks/useIsScrollEnd';
import CollabInputs from '../../../../note/components/CollabInputs';
import MoreOptionsButton from '../../../../note/components/MoreOptionsButton';
import RedoButton from '../../../../note/components/RedoButton';
import UndoButton from '../../../../note/components/UndoButton';
import { LocalNoteEditingContext } from '../../../../note-local/context/LocalNoteEditingContext';
import useDeleteLocalNote from '../../../../note-local/hooks/useDeleteLocalNote';
import useLocalNoteExists from '../../../../note-local/hooks/useLocalNoteExists';
import { useProxyNavigate } from '../../../../router/context/ProxyRoutesProvider';
import usePreviousLocation from '../../../../router/hooks/usePreviousLocation';

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
