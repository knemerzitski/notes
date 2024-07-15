import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

import { useNoteContentId } from '../context/NoteContentIdProvider';
import useUnarchiveNoteWithUndo from '../hooks/useUnarchiveNoteWithUndo';

export interface UnarchvieButtonProps {
  iconButtonProps?: IconButtonProps;
}

export default function UnarchiveNoteButton({ iconButtonProps }: UnarchvieButtonProps) {
  const noteContentId = useNoteContentId(true);
  const unarchiveNoteWithUndo = useUnarchiveNoteWithUndo(noteContentId ?? undefined);

  if (!noteContentId) {
    return (
      <BaseButton
        iconButtonProps={{
          disabled: true,
          ...iconButtonProps,
        }}
      />
    );
  }

  return (
    <BaseButton
      iconButtonProps={{
        onClick: unarchiveNoteWithUndo,
        'aria-label': 'archive note',
        ...iconButtonProps,
      }}
    />
  );
}

function BaseButton({ iconButtonProps }: UnarchvieButtonProps) {
  return (
    <Tooltip title="Unarchive">
      <span>
        <IconButton color="inherit" size="medium" {...iconButtonProps}>
          <UnarchiveIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
