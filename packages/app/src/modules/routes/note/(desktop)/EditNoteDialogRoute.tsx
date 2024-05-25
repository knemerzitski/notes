import { useLocation, useParams } from 'react-router-dom';

import NoteDialog from '../../../note/components/NoteDialog';
import useDeleteNote from '../../../note/hooks/useDeleteNote';
import { Dispatch, useState } from 'react';
import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../common/components/RouteClosable';
import RouteSnackbarError from '../../../common/components/RouteSnackbarError';
import { NoteEditingContext } from '../../../note/context/NoteEditingContext';
import CollabInputs from '../../../note/components/CollabInputs';
import { Box, Button, AppBar as MuiAppBar, useTheme } from '@mui/material';
import useIsElementScrollEnd from '../../../common/hooks/useIsElementScrollEnd';
import MoreOptionsButton from '../../../note/components/MoreOptionsButton';
import UndoButton from '../../../note/components/UndoButton';
import RedoButton from '../../../note/components/RedoButton';
import NewNoteEditingContext from '../../../note/context/NewNoteEditingContext';

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

  async function handleDeleteNote() {
    if (!noteContentId) return false;
    return deleteNote(noteContentId);
  }

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
      {!noteContentId || isNewNote ? (
        <NewNoteEditingContext>
          <CollabEditor
            isScrollEnd={isScrollEnd}
            onDelete={handleDeleteNote}
            onClose={onClosing}
            setCollabInputsEl={setCollabInputsEl}
          />
        </NewNoteEditingContext>
      ) : (
        <NoteEditingContext noteContentId={noteContentId}>
          <CollabEditor
            isScrollEnd={isScrollEnd}
            onDelete={handleDeleteNote}
            onClose={onClosing}
            setCollabInputsEl={setCollabInputsEl}
          />
        </NoteEditingContext>
      )}
    </NoteDialog>
  );
}

interface CollabEditorProps {
  isScrollEnd?: boolean;
  onDelete?: () => Promise<boolean>;
  onClose: () => void;
  setCollabInputsEl: Dispatch<React.SetStateAction<HTMLElement | undefined>>;
}

function CollabEditor({
  isScrollEnd,
  setCollabInputsEl,
  onDelete,
  onClose,
}: CollabEditorProps) {
  return (
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
            <MoreOptionsButton onDelete={onDelete} />
            <UndoButton />
            <RedoButton />
          </Box>
          <Button
            color="inherit"
            size="small"
            onClick={onClose}
            sx={{
              mr: 1,
            }}
          >
            Close
          </Button>
        </Box>
      </MuiAppBar>
    </>
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
