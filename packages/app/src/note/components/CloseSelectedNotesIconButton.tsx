import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Tooltip } from '@mui/material';

import { useSelectedNoteIdsModel } from '../context/selected-note-ids';

export function CloseSelectedNotesIconButton() {
  const selectedNoteIdsModel = useSelectedNoteIdsModel();
  function handleClose() {
    selectedNoteIdsModel.clear();
  }

  return (
    <IconButton onClick={handleClose} aria-label="close selected notes" edge="start">
      <Tooltip title="Close">
        <CloseIcon />
      </Tooltip>
    </IconButton>
  );
}
