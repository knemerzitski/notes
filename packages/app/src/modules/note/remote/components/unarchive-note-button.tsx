import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

import { useNoteContentId } from '../context/note-content-id-provider';
import { useUnarchiveNoteWithUndo } from '../hooks/use-unarchive-note-with-undo';

export interface UnarchvieButtonProps {
  iconButtonProps?: IconButtonProps;
}

export function UnarchiveNoteButton({ iconButtonProps }: UnarchvieButtonProps) {
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
        'aria-label': 'archive note',
        ...iconButtonProps,
        onClick: (e) => {
          unarchiveNoteWithUndo();
          iconButtonProps?.onClick?.(e);
        },
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
