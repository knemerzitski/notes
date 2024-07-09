import {
  ClickAwayListener,
  Paper,
  PaperProps,
  AppBar as MuiAppBar,
  Box,
  Button,
  Theme,
  SxProps,
} from '@mui/material';
import { ReactNode, useRef, useState } from 'react';

import CollabContentInput, {
  CollabContentInputProps,
} from '../../remote/components/CollabContentInput';
import CollabInputs from '../../remote/components/CollabInputs';
import MoreOptionsButton, {
  MoreOptionsButtonProps,
} from '../../remote/components/MoreOptionsButton';
import RedoButton from '../../remote/components/RedoButton';
import UndoButton from '../../remote/components/UndoButton';

export interface CreateNoteWidgetProps {
  /**
   * Note should be created when this function is invoked.
   */
  onCreate?: () => void;
  /**
   * Collapses widget only display single field for content
   * @param deleted Widget collapses because 'Delete note' was clicked
   */
  onCollapse?: (deleted?: boolean) => void;
  paperProps?: PaperProps;
  initialContentInputProps?: CollabContentInputProps;
  moreOptionsButtonProps?: Omit<MoreOptionsButtonProps, 'onOpened' | 'onClosed'>;
  slots?: {
    toolbar?: ReactNode;
  };
}

export default function CreateNoteWidget({
  onCreate,
  onCollapse,
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
    onCollapse?.(deleted);
    isCreatedCalledRef.current = false;
  }

  function handleDeleteNote() {
    handleCloseWidget(true);
    moreOptionsButtonProps?.onDelete?.();
  }

  const baseSx: SxProps<Theme> = {
    borderRadius: 2,
    boxShadow: 3,
    width: 'min(100%, 600px)',
  };

  return (
    <>
      <Paper
        variant="outlined"
        {...paperProps}
        sx={{
          px: 2,
          py: 2,
          display: isEditorOpen ? 'none' : undefined,
          ...baseSx,
          ...paperProps?.sx,
        }}
      >
        <CollabContentInput
          {...initialContentInputProps}
          inputProps={{
            placeholder: 'Take a note...',
            onChange: handleTextChange,
            onFocus: handleExpandEditor,
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
              zIndex: 1,
              display: undefined,
              ...baseSx,
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
