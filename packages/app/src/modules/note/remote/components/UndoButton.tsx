import UndoIcon from '@mui/icons-material/Undo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

import { useFocusedEditor } from '../context/FocusedEditorProvider';

export interface UndoButtonProps {
  iconButtonProps?: IconButtonProps;
}

export default function UndoButton({ iconButtonProps }: UndoButtonProps) {
  const editor = useFocusedEditor();
  const [canUndo, setCanUndo] = useState(editor.canUndo());

  function handleClickUndo() {
    if (!editor.undo()) {
      setCanUndo(false);
    }
  }

  useEffect(() => {
    setCanUndo(editor.canUndo());
    return editor.eventBus.onMany(
      ['appliedTypingOperation', 'userRecordsUpdated'],
      () => {
        setCanUndo(editor.canUndo());
      }
    );
  }, [editor]);

  return (
    <Tooltip title="Undo">
      <span>
        <IconButton
          onClick={handleClickUndo}
          color="inherit"
          aria-label="note history undo"
          size="medium"
          disabled={!canUndo}
          {...iconButtonProps}
        >
          <UndoIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
