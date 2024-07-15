import { Box, Button, AppBar as MuiAppBar, useTheme } from '@mui/material';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../common/components/RouteClosable';
import RouteSnackbarError from '../../../common/components/RouteSnackbarError';
import useIsElementScrollEnd from '../../../common/hooks/useIsElementScrollEnd';
import MoreOptionsButton from '../../../note/base/MoreOptionsButton';
import CollabInputs from '../../../note/base/components/CollabInputs';
import NoteDialog from '../../../note/base/components/NoteDialog';
import RedoButton from '../../../note/base/components/RedoButton';
import UndoButton from '../../../note/base/components/UndoButton';
import ArchiveOrUnarchiveNoteButton from '../../../note/remote/components/ArchiveOrUnarchiveNoteButton';
import ManageNoteSharingButton from '../../../note/remote/components/ManageNoteSharingButton';
import NewOrExistingNoteEditingContext from '../../../note/remote/context/NewOrExistingNoteEditingContext';
import useDeleteNote from '../../../note/remote/hooks/useDeleteNote';

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
                <ManageNoteSharingButton />
                <ArchiveOrUnarchiveNoteButton />
                <UndoButton />
                <RedoButton />
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

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
