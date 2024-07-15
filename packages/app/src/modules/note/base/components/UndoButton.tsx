import UndoIcon from '@mui/icons-material/Undo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

import { useFocusedEditor } from '../../remote/context/FocusedEditorProvider';

export interface UndoButtonProps {
  iconButtonProps?: IconButtonProps;
  /**
   * - hidden: Button is not rendered
   * - disabled: Button is rendered with disabled state
   * - error: Runtime error will be thrown
   *
   * @default "error"
   */
  noFocusedEditorBehaviour?: 'hidden' | 'disabled' | 'error';
}

export default function UndoButton({
  iconButtonProps,
  noFocusedEditorBehaviour = 'error',
}: UndoButtonProps) {
  const editor = useFocusedEditor(noFocusedEditorBehaviour !== 'error');
  const [canUndo, setCanUndo] = useState(editor?.canUndo());

  function handleClickUndo() {
    if (!editor) return;

    if (!editor.undo()) {
      setCanUndo(false);
    }
  }

  useEffect(() => {
    if (!editor) return;

    setCanUndo(editor.canUndo());
    return editor.eventBus.onMany(
      ['appliedTypingOperation', 'userRecordsUpdated'],
      () => {
        setCanUndo(editor.canUndo());
      }
    );
  }, [editor]);

  if (!editor && noFocusedEditorBehaviour === 'hidden') {
    return null;
  }

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
