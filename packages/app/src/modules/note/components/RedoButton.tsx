import RedoIcon from '@mui/icons-material/Redo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

import { useFocusedEditor } from '../context/FocusedEditorProvider';


export interface RedoButtonProps {
  iconButtonProps?: IconButtonProps;
}

export default function RedoButton({ iconButtonProps }: RedoButtonProps) {
  const editor = useFocusedEditor();
  const [canRedo, setCanRedo] = useState(editor.canRedo());

  function handleClickRedo() {
    if (!editor.redo()) {
      setCanRedo(false);
    }
  }

  useEffect(() => {
    setCanRedo(editor.canRedo());
    return editor.eventBus.onMany(
      ['appliedTypingOperation', 'userRecordsUpdated'],
      () => {
        setCanRedo(editor.canRedo());
      }
    );
  }, [editor]);

  return (
    <Tooltip title="Redo">
      <span>
        <IconButton
          onClick={handleClickRedo}
          color="inherit"
          aria-label="note history redo"
          size="medium"
          disabled={!canRedo}
          {...iconButtonProps}
        >
          <RedoIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
