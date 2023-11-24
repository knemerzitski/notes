import { Paper, PaperProps, Typography, useTheme } from '@mui/material';
import { useRef, useState } from 'react';

import { Note } from '../__generated__/graphql';
import {
  useProxyIsAbsolutePathname,
  useProxyNavigate,
} from '../router/ProxyRoutesProvider';

import NoteToolbar from './NoteToolbar';

export default function NoteItem({
  note,
  sx,
  onDelete,
  ...restProps
}: {
  note: Note;
  onDelete: () => Promise<boolean>;
} & PaperProps) {
  const theme = useTheme();

  const [isHover, setHover] = useState(false);
  const mouseOverRef = useRef(false);
  const optionsMenuOpenRef = useRef(false);

  const navigate = useProxyNavigate();
  const pathnameEditing = useProxyIsAbsolutePathname(`/note/${note.id}`);

  const noteBeforeEditRef = useRef<Note | null>(null);
  if (!pathnameEditing) {
    noteBeforeEditRef.current = null;
  }

  const editing = noteBeforeEditRef.current != null;
  const visibleNote = noteBeforeEditRef.current ?? note;

  function handleEditNote() {
    noteBeforeEditRef.current = note;

    navigate(`/note/${note.id}`);
  }

  return (
    <Paper
      key={visibleNote.id}
      onClick={handleEditNote}
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
        ...(editing && {
          visibility: 'hidden',
        }),
        ...sx,
      }}
    >
      <Typography
        sx={{
          fontWeight: (theme) => theme.typography.fontWeightMedium,
          fontSize: '1.2em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {visibleNote.title}
      </Typography>
      <Typography
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'pre-wrap',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: '10',
          textAlign: 'left',
          flexGrow: 1,
        }}
      >
        {visibleNote.content}
      </Typography>

      <NoteToolbar
        slots={{
          moreOptionsButton: {
            onMenuOpened() {
              optionsMenuOpenRef.current = true;
              mouseOverRef.current = false;
            },
            onMenuClosed() {
              optionsMenuOpenRef.current = false;
              if (!mouseOverRef.current) {
                setHover(false);
              }
            },
            onDelete,
            edge: 'end',
          },
        }}
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          opacity: isHover ? 0.9 : 0,
          transition: 'opacity .15s',
          mt: 1,
        }}
      />
    </Paper>
  );
}
