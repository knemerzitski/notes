import {
  ClickAwayListener,
  Paper,
  PaperProps,
  AppBar as MuiAppBar,
  Box,
  Button,
} from '@mui/material';
import { useState } from 'react';

import CollabContentInput from './CollabContentInput';
import CollabInputs from './CollabInputs';
import MoreOptionsButton from './MoreOptionsButton';
import UndoButton from './UndoButton';
import RedoButton from './RedoButton';

export interface CreateNoteWidgetProps extends PaperProps {
  onCreate: () => void;
  onClose?: () => void;
}

export default function CreateNoteWidget({
  onCreate,
  onClose,
  ...restProps
}: CreateNoteWidgetProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  function handleStartEditing() {
    if (!isEditorOpen) {
      onCreate();
      setIsEditorOpen(true);
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
        {...restProps}
        sx={{
          px: 2,
          py: 2,
          borderRadius: 2,
          boxShadow: 3,
          display: isEditorOpen ? 'none' : undefined,
          ...restProps.sx,
        }}
      >
        <CollabContentInput
          inputProps={{
            placeholder: 'Take a note...',
            onChange: handleStartEditing,
            onClick: handleStartEditing,
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
            {...restProps}
            sx={{
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1,
              display: undefined,
              ...restProps.sx,
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
                  <MoreOptionsButton
                    onDelete={() => {
                      handleDeleteNote();
                      return Promise.resolve(true);
                    }}
                  />
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
