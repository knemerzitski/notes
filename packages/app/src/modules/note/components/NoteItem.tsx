import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';
import {
  Box,
  Paper,
  PaperProps,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { ReactNode, useRef, useState } from 'react';

import MoreOptionsButton from './MoreOptionsButton';

interface Note {
  id: string;
  editing?: boolean;
  title: string;
  content: string;
  type?: 'linked' | 'shared';
  slots?: {
    toolbar?: ReactNode;
  };
}

export interface NoteItemProps extends PaperProps {
  note: Note;
  onStartEdit?: () => void;
  onDelete?: () => Promise<boolean>;
}

export default function NoteItem({
  note,
  onStartEdit,
  onDelete,
  ...restProps
}: NoteItemProps) {
  const theme = useTheme();

  const [isHover, setHover] = useState(false);
  const mouseOverRef = useRef(false);
  const optionsMenuOpenRef = useRef(false);

  const noteBeforeEditRef = useRef<Note | null>(null);
  if (!note.editing) {
    noteBeforeEditRef.current = null;
  }

  const visibleNote = noteBeforeEditRef.current ?? note;

  function handleStartEdit() {
    if (onStartEdit) {
      noteBeforeEditRef.current = note;
      onStartEdit();
    }
  }

  let cornerIcon = null;
  if (note.type === 'linked') {
    cornerIcon = (
      <Tooltip
        sx={(theme) => ({
          position: 'absolute',
          right: theme.spacing(1),
          top: theme.spacing(1),
        })}
        title="Linked from another user"
      >
        <LinkIcon fontSize="small" />
      </Tooltip>
    );
  } else if (note.type === 'shared') {
    cornerIcon = (
      <Tooltip
        sx={(theme) => ({
          position: 'absolute',
          right: theme.spacing(1),
          top: theme.spacing(1),
        })}
        title="Note is shared"
      >
        <PersonIcon fontSize="small" />
      </Tooltip>
    );
  }

  return (
    <Paper
      key={visibleNote.id}
      onClick={handleStartEdit}
      variant="outlined"
      onMouseEnter={() => {
        mouseOverRef.current = true;
        setHover(true);
      }}
      onMouseLeave={() => {
        mouseOverRef.current = false;
        if (!optionsMenuOpenRef.current) {
          setHover(false);
        }
      }}
      {...restProps}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        px: 2,
        pt: 2,
        pb: 1,
        borderRadius: 2,
        gap: 2,
        ...(isHover && {
          cursor: 'default',
          boxShadow: 1,
          ...(theme.palette.mode === 'dark' && {
            borderColor: alpha(theme.palette.divider, theme.palette.dividerHoverOpacity),
          }),
        }),
        ...(note.editing && {
          visibility: 'hidden',
        }),
        ...restProps.sx,
      }}
    >
      {cornerIcon}
      {visibleNote.title && (
        <Typography
          sx={{
            fontWeight: (theme) => theme.typography.fontWeightMedium,
            fontSize: '1.2em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: '1 0 auto',
            userSelect: 'none',
          }}
        >
          {visibleNote.title}
        </Typography>
      )}
      <Typography
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'pre-wrap',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: '7',
          textAlign: 'left',
          flex: '1 1 100%',
          userSelect: 'none',
        }}
      >
        {visibleNote.content}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          opacity: isHover ? 0.9 : 0,
          transition: 'opacity .15s',
          mt: 1,
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Box>{note.slots?.toolbar}</Box>

        <MoreOptionsButton
          onOpened={() => {
            optionsMenuOpenRef.current = true;
            mouseOverRef.current = false;
          }}
          onClosed={() => {
            optionsMenuOpenRef.current = false;
            if (!mouseOverRef.current) {
              setHover(false);
            }
          }}
          onDelete={onDelete}
          iconButtonProps={{
            edge: 'end',
            sx: {
              justifySelf: 'flex-end',
            },
          }}
        />
      </Box>
    </Paper>
  );
}
