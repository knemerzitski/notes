import {
  ClickAwayListener,
  Paper,
  PaperProps,
  AppBar as MuiAppBar,
  Box,
  Button,
} from '@mui/material';
import { ReactNode, useState } from 'react';

import CollabContentInput, { CollabContentInputProps } from './CollabContentInput';
import CollabInputs from './CollabInputs';
import MoreOptionsButton from './MoreOptionsButton';
import RedoButton from './RedoButton';
import UndoButton from './UndoButton';

export interface CreateNoteWidgetProps {
  onCreate?: () => void;
  onClose?: () => void;
  paperProps?: PaperProps;
  initialContentInputProps?: CollabContentInputProps;
  slots?: {
    toolbar?: ReactNode;
  };
}

export default function CreateNoteWidget({
  onCreate,
  onClose,
  paperProps,
  slots,
  initialContentInputProps,
}: CreateNoteWidgetProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  function handleStartEditing() {
    if (onCreate) {
      if (!isEditorOpen) {
        onCreate();
        setIsEditorOpen(true);
      }
    }
  }

  function handleCloseWidget() {
    setIsEditorOpen(false);
    onClose?.();
  }

  function handleDeleteNote() {
    handleCloseWidget();
  }

  return (
    <>
      <Paper
        variant="outlined"
        {...paperProps}
        sx={{
          px: 2,
          py: 2,
          borderRadius: 2,
          boxShadow: 3,
          display: isEditorOpen ? 'none' : undefined,
          ...paperProps?.sx,
        }}
      >
        <CollabContentInput
          {...initialContentInputProps}
          inputProps={{
            placeholder: 'Take a note...',
            onChange: handleStartEditing,
            onClick: handleStartEditing,
            ...initialContentInputProps?.inputProps,
          }}
        />
      </Paper>

      {isEditorOpen && (
        <ClickAwayListener
          onClickAway={handleCloseWidget}
          touchEvent="onTouchStart"
          mouseEvent="onMouseDown"
        >
          <Paper
            variant="outlined"
            {...paperProps}
            sx={{
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1,
              display: undefined,
              ...paperProps?.sx,
            }}
          >
            <CollabInputs
              contentProps={{
                inputProps: {
                  autoFocus: true,
                },
              }}
            />

            <MuiAppBar elevation={0} position="relative">
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

                  {slots?.toolbar}
                  <UndoButton />
                  <RedoButton />
                </Box>
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleCloseWidget}
                  sx={{
                    mr: 1,
                  }}
                >
                  Close
                </Button>
              </Box>
            </MuiAppBar>
          </Paper>
        </ClickAwayListener>
      )}
    </>
  );
}
