import { IconButton } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import { useFocusedEditor } from '../context/FocusedEditorProvider';
import { useEffect, useState } from 'react';

export default function UndoButton() {
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
      ['appliedTypingOperation', 'tailRevisionChanged'],
      () => {
        setCanUndo(editor.canUndo());
      }
    );
  }, [editor]);

  return (
    <IconButton
      onClick={handleClickUndo}
      color="inherit"
      aria-label="note history undo"
      size="medium"
      disabled={!canUndo}
    >
      <UndoIcon />
    </IconButton>
  );
}