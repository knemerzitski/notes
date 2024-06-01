import { Box, Paper, PaperProps, Typography, useTheme } from '@mui/material';
import { useRef, useState } from 'react';

import MoreOptionsButton from './MoreOptionsButton';

interface Note {
  id: string;
  editing?: boolean;
  title: string;
  content: string;
}

export interface NoteItemProps extends PaperProps {
  note: Note;
  onStartEdit: () => void;
  onDelete: () => Promise<boolean>;
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
    noteBeforeEditRef.current = note;
    onStartEdit();
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
            borderColor: 'rgba(255,255,255,0.16)',
          }),
        }),
        ...(note.editing && {
          visibility: 'hidden',
        }),
        ...restProps.sx,
      }}
    >
      {visibleNote.title && (
        <Typography
          sx={{
            fontWeight: (theme) => theme.typography.fontWeightMedium,
            fontSize: '1.2em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: '1 0 auto',
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
        }}
      >
        {visibleNote.content}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          opacity: isHover ? 0.9 : 0,
          transition: 'opacity .15s',
          mt: 1,
        }}
      >
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
          }}
        />
      </Box>
    </Paper>
  );
}
