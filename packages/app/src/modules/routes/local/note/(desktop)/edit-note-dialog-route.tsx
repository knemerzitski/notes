import { AppBar as MuiAppBar, Box, Button, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  RouteClosableComponentProps, RouteClosable
} from '../../../../common/components/route-closable';
import { RouteSnackbarError } from '../../../../common/components/route-snackbar-error';
import { useIsElementScrollEnd } from '../../../../common/hooks/use-is-element-scroll-end';
import { CollabInputs } from '../../../../note/base/components/collab-inputs';
import { NoteDialog } from '../../../../note/base/components/note-dialog';
import { MoreOptionsButton } from '../../../../note/base/more-options-button';
import { NoteToolbar } from '../../../../note/local/components/note-toolbar';
import { NoteEditingContext } from '../../../../note/local/context/note-editing-context';
import { useDeleteNote } from '../../../../note/local/hooks/use-delete-note';
import { useNoteExists } from '../../../../note/local/hooks/use-note-exists';
import { BackgroundPathProvider } from '../../../../router/context/background-path-provider';

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

export function EditNoteDialogRoute({ parentPath }: { parentPath?: string }) {
  return (
    <BackgroundPathProvider path={parentPath}>
      <RouteClosable Component={RouteClosableEditNoteDialog} />
    </BackgroundPathProvider>
  );
}
