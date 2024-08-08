import { Box, Button, AppBar as MuiAppBar, useTheme } from '@mui/material';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import {
  RouteClosableComponentProps, RouteClosable
} from '../../../common/components/route-closable';
import { RouteSnackbarError } from '../../../common/components/route-snackbar-error';
import { useIsElementScrollEnd } from '../../../common/hooks/use-is-element-scroll-end';
import { CollabInputs } from '../../../note/base/components/collab-inputs';
import { NoteDialog } from '../../../note/base/components/note-dialog';
import { MoreOptionsButton } from '../../../note/base/more-options-button';
import { NoteToolbar } from '../../../note/remote/components/note-toolbar';
import { NewOrExistingNoteEditingContext } from '../../../note/remote/context/new-or-existing-note-editing-context';
import { useDeleteNote } from '../../../note/remote/hooks/use-delete-note';

export type EditNoteLocationState = null | { newNote?: boolean; autoFocus?: boolean };

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const deleteNote = useDeleteNote();
  const params = useParams<'id'>();
  const location = useLocation();
  const state = location.state as EditNoteLocationState;
  const noteContentId = params.id;
  const theme = useTheme();

  const isNewNote = Boolean(state?.newNote);

  const [collabInputsEl, setCollabInputsEl] = useState<HTMLElement>();
  const isScrollEnd = useIsElementScrollEnd(collabInputsEl);

  function handleDeleteNote() {
    if (!noteContentId) return;

    void deleteNote(noteContentId);
    onClosed(true);
  }

  // TODO make note active?

  if (!noteContentId && !isNewNote) {
    return <RouteSnackbarError>Empty note id</RouteSnackbarError>;
  }

  return (
    <NoteDialog
      open={open}
      onClose={onClosing}
      onTransitionExited={onClosed}
      PaperProps={{
        sx: {
          boxSizing: 'content-box',
          border: theme.palette.mode === 'light' ? 'transparent' : undefined,
        },
      }}
    >
      <NewOrExistingNoteEditingContext
        noteContentId={noteContentId}
        isNewNote={isNewNote}
      >
        <>
          <CollabInputs
            boxProps={{
              ref: (el: HTMLElement) => {
                setCollabInputsEl(el);
              },
            }}
          />

          <MuiAppBar
            elevation={0}
            position="relative"
            color="default"
            sx={{
              ...(!isScrollEnd && {
                boxShadow: (theme) => theme.shadowsNamed.scrollEnd,
              }),
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Box
                sx={{
                  p: 1,
                  gap: 1,
                  display: 'flex',
                }}
              >
                <MoreOptionsButton onDelete={handleDeleteNote} />
                <NoteToolbar />
              </Box>
              <Button
                color="inherit"
                size="small"
                onClick={onClosing}
                sx={{
                  mr: 1,
                }}
              >
                Close
              </Button>
            </Box>
          </MuiAppBar>
        </>
      </NewOrExistingNoteEditingContext>
    </NoteDialog>
  );
}

export function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
