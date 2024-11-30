import { IconButton, IconButtonProps } from '@mui/material';
import { useNoteId } from '../../note/context/note-id';
import { devNoteIdVar } from '../reactive-vars';
import BugReportIcon from '@mui/icons-material/BugReport';

export const DevSetActiveNoteIdButton = import.meta.env.PROD
  ? () => null // Render nothing in production
  : _DevSetActiveNoteIdButton;

export function _DevSetActiveNoteIdButton() {
  const noteId = useNoteId();

  const handleClick: IconButtonProps['onClick'] = (e) => {
    e.stopPropagation();
    devNoteIdVar(noteId);
  };

  return (
    <IconButton
      color="warning"
      size="small"
      onClick={handleClick}
      sx={{
        width: 32,
        height: 32,
        alignSelf: 'center',
      }}
    >
      <BugReportIcon fontSize="small" />
    </IconButton>
  );
}
