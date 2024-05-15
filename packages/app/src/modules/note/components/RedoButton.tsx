import { IconButton } from '@mui/material';
import RedoIcon from '@mui/icons-material/Redo';
import { useFocusedEditor } from '../context/FocusedEditorProvider';
import { useEffect, useState } from 'react';

export default function RedoButton() {
  const editor = useFocusedEditor();
  const [canRedo, setCanRedo] = useState(editor.canRedo());

  function handleClickRedo() {
    if (!editor.redo()) {
      setCanRedo(false);
    }
  }

  useEffect(() => {
    setCanRedo(editor.canRedo());
    return editor.eventBus.on('appliedTypingOperation', () => {
      setCanRedo(editor.canRedo());
    });
  }, [editor]);

  return (
    <IconButton
      onClick={handleClickRedo}
      color="inherit"
      aria-label="note history redo"
      size="medium"
      disabled={!canRedo}
    >
      <RedoIcon />
    </IconButton>
  );
}
