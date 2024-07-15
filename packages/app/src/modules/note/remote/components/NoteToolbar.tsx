import { IconButtonProps } from '@mui/material';

import RedoButton, { RedoButtonProps } from '../../base/components/RedoButton';
import UndoButton, { UndoButtonProps } from '../../base/components/UndoButton';

import ArchiveOrUnarchiveNoteButton, {
  ArchiveOrUnarchiveNoteButtonProps,
} from './ArchiveOrUnarchiveNoteButton';
import ManageNoteSharingButton, {
  ManageNoteSharingButtonProps,
} from './ManageNoteSharingButton';

export interface NoteToolbarProps {
  generic?: {
    start?: IconButtonProps;
    end?: IconButtonProps;
    all?: IconButtonProps;
  };
  specific?: {
    manageNoteSharing?: ManageNoteSharingButtonProps;
    archiveOrUnarchive?: ArchiveOrUnarchiveNoteButtonProps;
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
      <ManageNoteSharingButton
        {...specific?.manageNoteSharing}
        iconButtonProps={{
          ...generic?.all,
          ...generic?.start,
          ...specific?.manageNoteSharing?.iconButtonProps,
        }}
      />
      <ArchiveOrUnarchiveNoteButton
        {...specific?.archiveOrUnarchive}
        iconButtonProps={{
          ...generic?.all,
          ...specific?.archiveOrUnarchive?.iconButtonProps,
        }}
      />
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
