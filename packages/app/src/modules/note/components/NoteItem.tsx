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
  styled,
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

export interface NoteItemProps {
  paperProps?: PaperProps;
  note: Note;
  onStartEdit?: () => void;
  onDelete?: () => Promise<boolean>;
}

const TitleTypography = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: '1.2em',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: '1 0 auto',
  userSelect: 'none',
}));

const ContentTypography = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'pre-wrap',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: '7',
  textAlign: 'left',
  flex: '1 1 100%',
  userSelect: 'none',
});

function NoteInnerBadge({ type }: Pick<Note, 'type'>) {
  switch (type) {
    case 'linked':
      return (
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
    case 'shared':
      return (
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

  return null;
}

export default function NoteItem({
  paperProps,
  note,
  onStartEdit,
  onDelete,
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
      {...paperProps}
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
        ...paperProps?.sx,
      }}
    >
      <NoteInnerBadge {...note} />
      {visibleNote.title && <TitleTypography>{visibleNote.title}</TitleTypography>}
      <ContentTypography>{visibleNote.content}</ContentTypography>

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
