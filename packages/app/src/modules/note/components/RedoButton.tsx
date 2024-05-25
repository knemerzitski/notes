import { IconButton, IconButtonProps } from '@mui/material';
import RedoIcon from '@mui/icons-material/Redo';
import { useFocusedEditor } from '../context/FocusedEditorProvider';
import { useEffect, useState } from 'react';

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
  );
}
