import { AppBar as MuiAppBar, Box, Button, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../../common/components/RouteClosable';
import RouteSnackbarError from '../../../../common/components/RouteSnackbarError';
import useIsElementScrollEnd from '../../../../common/hooks/useIsElementScrollEnd';
import MoreOptionsButton from '../../../../note/base/MoreOptionsButton';
import CollabInputs from '../../../../note/base/components/CollabInputs';
import NoteDialog from '../../../../note/base/components/NoteDialog';
import NoteToolbar from '../../../../note/local/components/NoteToolbar';
import { NoteEditingContext } from '../../../../note/local/context/NoteEditingContext';
import useDeleteNote from '../../../../note/local/hooks/useDeleteNote';
import useNoteExists from '../../../../note/local/hooks/useNoteExists';
import { BackgroundPathProvider } from '../../../../router/context/BackgroundPathProvider';

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const deleteNote = useDeleteNote();
  const params = useParams<'id'>();
  const localNoteId = params.id;
  const theme = useTheme();

  const [collabInputsEl, setCollabInputsEl] = useState<HTMLElement>();
  const isScrollEnd = useIsElementScrollEnd(collabInputsEl);

  const noteExists = useNoteExists(localNoteId ?? '');

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
      <NoteEditingContext noteId={localNoteId}>
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
      </NoteEditingContext>
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
