import RedoIcon from '@mui/icons-material/Redo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

import { useFocusedEditor } from '../../remote/context/FocusedEditorProvider';

export interface RedoButtonProps {
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

export default function RedoButton({
  iconButtonProps,
  noFocusedEditorBehaviour = 'error',
}: RedoButtonProps) {
  const editor = useFocusedEditor(noFocusedEditorBehaviour !== 'error');
  const [canRedo, setCanRedo] = useState(editor?.canRedo());

  function handleClickRedo() {
    if (!editor) return;

    if (!editor.redo()) {
      setCanRedo(false);
    }
  }

  useEffect(() => {
    if (!editor) return;

    setCanRedo(editor.canRedo());
    return editor.eventBus.onMany(
      ['appliedTypingOperation', 'userRecordsUpdated'],
      () => {
        setCanRedo(editor.canRedo());
      }
    );
  }, [editor]);

  if (!editor && noFocusedEditorBehaviour === 'hidden') {
    return null;
  }

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
