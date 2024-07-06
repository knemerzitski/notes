import {
  ClickAwayListener,
  Paper,
  PaperProps,
  AppBar as MuiAppBar,
  Box,
  Button,
} from '@mui/material';
import { ReactNode, useRef, useState } from 'react';

import CollabContentInput, { CollabContentInputProps } from './CollabContentInput';
import CollabInputs from './CollabInputs';
import MoreOptionsButton, { MoreOptionsButtonProps } from './MoreOptionsButton';
import RedoButton from './RedoButton';
import UndoButton from './UndoButton';

export interface CreateNoteWidgetProps {
  onCreate?: () => void;
  onClose?: (deleted?: boolean) => void;
  paperProps?: PaperProps;
  initialContentInputProps?: CollabContentInputProps;
  moreOptionsButtonProps?: Omit<MoreOptionsButtonProps, 'onOpened' | 'onClosed'>;
  slots?: {
    toolbar?: ReactNode;
  };
}

export default function CreateNoteWidget({
  onCreate,
  onClose,
  paperProps,
  slots,
  moreOptionsButtonProps,
  initialContentInputProps,
}: CreateNoteWidgetProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const isCreatedCalledRef = useRef(false);

  function createOnce() {
    if (!onCreate || isCreatedCalledRef.current) return;
    onCreate();
    isCreatedCalledRef.current = true;
  }

  function handleTextChange() {
    createOnce();
  }

  function handleExpandEditor() {
    setIsEditorOpen(true);
  }

  function handleCloseWidget(deleted?: boolean) {
    setIsEditorOpen(false);
    onClose?.(deleted);
    isCreatedCalledRef.current = false;
  }

  function handleDeleteNote() {
    handleCloseWidget(true);
    moreOptionsButtonProps?.onDelete?.();
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
            onChange: handleTextChange,
            onClick: handleExpandEditor,
            ...initialContentInputProps?.inputProps,
          }}
        />
      </Paper>

      {isEditorOpen && (
        <ClickAwayListener
          onClickAway={() => {
            handleCloseWidget();
          }}
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
              titleProps={{
                inputProps: {
                  onChange: handleTextChange,
                },
              }}
              contentProps={{
                inputProps: {
                  onChange: handleTextChange,
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
                    {...moreOptionsButtonProps}
                    onDelete={handleDeleteNote}
                  />

                  {slots?.toolbar}
                  <UndoButton />
                  <RedoButton />
                </Box>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    handleCloseWidget();
                  }}
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
