import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  AppBar as MuiAppBar,
  Box,
  IconButton,
  Toolbar as MuiToolbar,
} from '@mui/material';
import { useLocation, useParams } from 'react-router-dom';

import AppBar from '../../../common/components/AppBar';
import RouteSnackbarError from '../../../common/components/RouteSnackbarError';
import useIsScrollEnd from '../../../common/hooks/useIsScrollEnd';
import CollabInputs from '../../../note/components/CollabInputs';
import CollaborationButton from '../../../note/components/CollaborationButton';
import MoreOptionsButton from '../../../note/components/MoreOptionsButton';
import RedoButton from '../../../note/components/RedoButton';
import UndoButton from '../../../note/components/UndoButton';
import NewOrExistingNoteEditingContext from '../../../note/context/NewOrExistingNoteEditingContext';
import useDeleteNote from '../../../note/hooks/useDeleteNote';
import { useProxyNavigate } from '../../../router/context/ProxyRoutesProvider';
import usePreviousLocation from '../../../router/hooks/usePreviousLocation';
import SyncStatusButton from '../../@layouts/appbar-drawer/SyncStatusButton';

export type EditNoteLocationState = null | { newNote?: boolean; autoFocus?: boolean };

export default function EditNotePage() {
  const deleteNote = useDeleteNote();
  const params = useParams<'id'>();
  const location = useLocation();
  const state = location.state as EditNoteLocationState;
  const noteContentId = params.id;
  const previousLocation = usePreviousLocation();
  const navigate = useProxyNavigate();

  const isNewNote = Boolean(state?.newNote);

  const isScrollEnd = useIsScrollEnd();

  async function handleDeleteNote() {
    if (!noteContentId) return false;
    return deleteNote(noteContentId);
  }

  if (!noteContentId && !isNewNote) {
    return <RouteSnackbarError>Empty note id</RouteSnackbarError>;
  }

  function handleClickBack() {
    if (previousLocation) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }
  const buttonSizePx = 24;
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
          <SyncStatusButton fontSize={buttonSizePx} size={buttonSize} edge="end" />
        </MuiToolbar>
      </AppBar>

      <MuiToolbar sx={{ height: '56px' }} />

      <NewOrExistingNoteEditingContext
        noteContentId={noteContentId}
        isNewNote={isNewNote}
      >
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
                <CollaborationButton
                  iconButtonProps={{
                    edge: 'start',
                    size: buttonSize,
                  }}
                />
                <UndoButton
                  iconButtonProps={{
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
      </NewOrExistingNoteEditingContext>
    </Box>
  );
}
