import { AppBar as MuiAppBar, Box, Button, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../../common/components/RouteClosable';
import RouteSnackbarError from '../../../../common/components/RouteSnackbarError';
import useIsElementScrollEnd from '../../../../common/hooks/useIsElementScrollEnd';
import { LocalNoteEditingContext } from '../../../../note/local/context/LocalNoteEditingContext';
import useDeleteLocalNote from '../../../../note/local/hooks/useDeleteLocalNote';
import useLocalNoteExists from '../../../../note/local/hooks/useLocalNoteExists';
import CollabInputs from '../../../../note/remote/components/CollabInputs';
import MoreOptionsButton from '../../../../note/remote/components/MoreOptionsButton';
import NoteDialog from '../../../../note/remote/components/NoteDialog';
import RedoButton from '../../../../note/remote/components/RedoButton';
import UndoButton from '../../../../note/remote/components/UndoButton';
import { BackgroundPathProvider } from '../../../../router/context/BackgroundPathProvider';

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const deleteNote = useDeleteLocalNote();
  const params = useParams<'id'>();
  const localNoteId = params.id;
  const theme = useTheme();

  const [collabInputsEl, setCollabInputsEl] = useState<HTMLElement>();
  const isScrollEnd = useIsElementScrollEnd(collabInputsEl);

  const noteExists = useLocalNoteExists(localNoteId ?? '');

  function handleDeleteNote() {
    if (!localNoteId) return;

    deleteNote(localNoteId);
    onClosed(true);
  }

  useEffect(() => {
    if (!localNoteId) {
      onClosed(true);
    }
  }, [localNoteId, onClosing, onClosed]);

  if (!localNoteId) {
    return null;
  }

  if (!noteExists) {
    return (
      <RouteSnackbarError>{`Local note '${localNoteId}' not found`}</RouteSnackbarError>
    );
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
      <LocalNoteEditingContext localNoteId={localNoteId}>
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
      </LocalNoteEditingContext>
    </NoteDialog>
  );
}

export default function EditNoteDialogRoute({ parentPath }: { parentPath?: string }) {
  return (
    <BackgroundPathProvider path={parentPath}>
      <RouteClosable Component={RouteClosableEditNoteDialog} />
    </BackgroundPathProvider>
  );
}
