import { Box, Button } from '@mui/material';
import { useState } from 'react';

import BorderlessTextField, {
  BorderlessTextFieldProps,
} from '../components/inputs/BorderlessTextField';
import useIsElementScrollEnd from '../hooks/useIsElementScrollEnd';
import { Note } from '../schema/__generated__/graphql';

import NoteToolbar from './NoteToolbar';

interface NoteEditorProps {
  note: Omit<Note, 'id'>;
  onChange: (changedNote: Omit<Note, 'id'>) => void;
  onDelete: () => Promise<boolean>;
  onClose?: () => void;
  slotProps?: {
    titleField?: BorderlessTextFieldProps;
    contentField?: BorderlessTextFieldProps;
  };
}

export default function NoteEditor({
  note,
  onChange,
  onDelete,
  onClose,
  slotProps,
}: NoteEditorProps) {
  const [scrollEl, setScrollEl] = useState<HTMLElement>();
  const isScrollEnd = useIsElementScrollEnd(scrollEl);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        ref={(ref) => {
          setScrollEl(ref as HTMLElement);
        }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: 2,
          overflow: 'auto',
        }}
      >
        <BorderlessTextField
          placeholder="Title"
          fullWidth
          value={note.title}
          onChange={(e) => {
            onChange({
              ...note,
              title: e.target.value,
            });
          }}
          {...slotProps?.titleField}
          sx={{
            '.MuiInputBase-root': {
              fontWeight: 'bold',
            },
            ...slotProps?.titleField?.sx,
          }}
        />
        <BorderlessTextField
          placeholder="Note"
          fullWidth
          multiline
          autoFocus
          autoSelection="end"
          value={note.content}
          onChange={(e) => {
            onChange({
              ...note,
              content: e.target.value,
            });
          }}
          {...slotProps?.contentField}
          sx={{
            flexGrow: 1,
            ...slotProps?.contentField?.sx,
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          pr: 2,
          ...(!isScrollEnd && {
            boxShadow: '0px 0px 5px 2px rgba(0,0,0,0.2)',
          }),
        }}
      >
        <NoteToolbar
          slots={{
            moreOptionsButton: {
              onDelete,
            },
          }}
          sx={{
            flexGrow: 1,
            p: 1,
          }}
        />
        <Button size="small" onClick={onClose} sx={{}}>
          Close
        </Button>
      </Box>
    </Box>
  );
}
