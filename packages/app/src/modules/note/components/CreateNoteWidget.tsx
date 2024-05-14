import { ClickAwayListener, Paper, PaperProps } from '@mui/material';
import { useState } from 'react';

import CollabNoteEditor from './CollabNoteEditor';
import CollabContentInput from './CollabContentInput';

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
            <CollabNoteEditor
              toolbarBoxProps={{
                onClose: handleCloseWidget,
                toolbarProps: {
                  moreOptionsButtonProps: {
                    onDelete: async () => {
                      handleDeleteNote();
                      return Promise.resolve(true);
                    },
                  },
                },
              }}
              collabFieldsProps={{
                contentProps: {
                  inputProps: {
                    autoFocus: true,
                  },
                },
              }}
            />
          </Paper>
        </ClickAwayListener>
      )}
    </>
  );
}
