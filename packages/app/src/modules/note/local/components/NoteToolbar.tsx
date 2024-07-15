import { IconButtonProps } from '@mui/material';

import RedoButton, { RedoButtonProps } from '../../base/components/RedoButton';
import UndoButton, { UndoButtonProps } from '../../base/components/UndoButton';

export interface NoteToolbarProps {
  generic?: {
    start?: IconButtonProps;
    end?: IconButtonProps;
    all?: IconButtonProps;
  };
  specific?: {
    undo?: UndoButtonProps;
    redo?: RedoButtonProps;
  };
  /**
   * Toolbar used in context where editor is available.
   * Renders buttons such as undo and redo.
   *
   * @default true
   */
  hasEditor?: boolean;
}

export default function NoteToolbar({
  generic,
  specific,
  hasEditor: editing = true,
}: NoteToolbarProps) {
  return (
    <>
      <UndoButton
        {...specific?.undo}
        iconButtonProps={{
          ...generic?.all,
          ...specific?.undo?.iconButtonProps,
        }}
        noFocusedEditorBehaviour={editing ? 'error' : 'hidden'}
      />
      <RedoButton
        {...specific?.redo}
        iconButtonProps={{
          ...generic?.all,
          ...generic?.end,
          ...specific?.redo?.iconButtonProps,
        }}
        noFocusedEditorBehaviour={editing ? 'error' : 'hidden'}
      />
    </>
  );
}
