import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  AppBar as MuiAppBar,
  Box,
  IconButton,
  Toolbar as MuiToolbar,
} from '@mui/material';
import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { AppBar } from '../../../common/components/app-bar';
import { RouteSnackbarError } from '../../../common/components/route-snackbar-error';
import { useIsScrollEnd } from '../../../common/hooks/use-is-scroll-end';
import { CollabInputs } from '../../../note/base/components/collab-inputs';
import { MoreOptionsButton } from '../../../note/base/more-options-button';
import { NoteToolbar } from '../../../note/remote/components/note-toolbar';
import { NewOrExistingNoteEditingContext } from '../../../note/remote/context/new-or-existing-note-editing-context';
import { useNoteContentId } from '../../../note/remote/context/note-content-id-provider';
import { useNoteCollabTextEditors } from '../../../note/remote/context/note-text-field-editors-provider';
import { useDeleteNote } from '../../../note/remote/hooks/use-delete-note';
import { useDiscardEmptyNote } from '../../../note/remote/hooks/use-discard-empty-note';
import { useProxyNavigate } from '../../../router/context/proxy-routes-provider';
import { usePreviousLocation } from '../../../router/hooks/use-previous-location';
import { SyncStatusButton } from '../../@layouts/appbar-drawer/sync-status-button';

export type EditNoteLocationState = null | { newNote?: boolean; autoFocus?: boolean };

export function EditNotePage() {
  const deleteNote = useDeleteNote();
  const params = useParams<'id'>();
  const location = useLocation();
  const state = location.state as EditNoteLocationState;
  const noteContentId = params.id;
  const previousLocation = usePreviousLocation();
  const navigate = useProxyNavigate();

  const isNewNote = Boolean(state?.newNote);
  const isOrWasNewNoteRef = useRef(isNewNote);

  const isScrollEnd = useIsScrollEnd();

  const leavingRouteCallbacksRef = useRef(new Set<() => void>());
  const addLeavingRouteCallback = useCallback((callback: () => void) => {
    leavingRouteCallbacksRef.current.add(callback);
    return () => {
      leavingRouteCallbacksRef.current.delete(callback);
    };
  }, []);

  function handleDeleteNote() {
    if (!noteContentId) return;
    void deleteNote(noteContentId);

    handleClickBack();
  }

  // TODO make note active?

  if (!noteContentId && !isNewNote) {
    return <RouteSnackbarError>Empty note id</RouteSnackbarError>;
  }

  function handleClickBack() {
    leavingRouteCallbacksRef.current.forEach((callback) => {
      callback();
    });

    if (previousLocation) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }
  const buttonSizePx = 24;
  const buttonSize = 'medium';

  return (
    <LeavingRouteContext.Provider value={addLeavingRouteCallback}>
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
          {isOrWasNewNoteRef.current && <DiscardEmptyNoteOnClose />}
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
                  <NoteToolbar
                    generic={{
                      start: {
                        edge: 'start',
                      },
                      end: {
                        edge: 'end',
                      },
                      all: {
                        size: buttonSize,
                      },
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
    </LeavingRouteContext.Provider>
  );
}

const LeavingRouteContext = createContext<((sub: () => void) => () => void) | null>(null);

function DiscardEmptyNoteOnClose() {
  const noteContentId = useNoteContentId(true);
  const editors = useNoteCollabTextEditors();

  const leavingRoute = useContext(LeavingRouteContext);

  const discardEmptyNote = useDiscardEmptyNote();

  useEffect(() => {
    if (!leavingRoute) return;

    return leavingRoute(() => {
      discardEmptyNote({
        note: noteContentId
          ? {
              contentId: noteContentId,
            }
          : null,
        editors,
      });
    });
  }, [leavingRoute, discardEmptyNote, noteContentId, editors]);

  return null;
}
