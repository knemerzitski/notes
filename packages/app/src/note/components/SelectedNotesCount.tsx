import { Tooltip } from '@mui/material';

import { useSelectedNoteIds } from '../hooks/useSelectedNoteIds';

export function SelectedNotesCount() {
  const noteIds = useSelectedNoteIds();

  return (
    <Tooltip title="Selected notes count">
      <span>{noteIds.length}</span>
    </Tooltip>
  );
}
