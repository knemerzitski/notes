import ArchiveIcon from '@mui/icons-material/Archive';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

import { useNoteContentId } from '../context/note-content-id-provider';
import { useArchiveNoteWithUndo } from '../hooks/use-archive-note-with-undo';

export interface ArchvieButtonProps {
  iconButtonProps?: IconButtonProps;
}

export function ArchiveNoteButton({ iconButtonProps }: ArchvieButtonProps) {
  const noteContentId = useNoteContentId(true);
  const archiveNoteWithUndo = useArchiveNoteWithUndo(noteContentId ?? undefined);

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
          archiveNoteWithUndo();
          iconButtonProps?.onClick?.(e);
        },
      }}
    />
  );
}

function BaseButton({ iconButtonProps }: ArchvieButtonProps) {
  return (
    <Tooltip title="Archive">
      <span>
        <IconButton color="inherit" size="medium" {...iconButtonProps}>
          <ArchiveIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
