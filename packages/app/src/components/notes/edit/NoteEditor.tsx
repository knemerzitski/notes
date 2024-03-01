import { Box, Button, InputProps } from '@mui/material';
import { useState } from 'react';

import useIsElementScrollEnd from '../../../hooks/useIsElementScrollEnd';
import PlainInput from '../../inputs/PlainInput';
import NoteToolbar from '../view/NoteToolbar';

export interface NoteEditorProps {
  onDelete: () => Promise<boolean>;
  onClose?: () => void;
  titleFieldProps?: InputProps;
  contentFieldProps: InputProps;
}

export default function NoteEditor({
  onDelete,
  onClose,
  titleFieldProps,
  contentFieldProps,
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
        <PlainInput
          placeholder="Title"
          fullWidth
          disableUnderline
          {...titleFieldProps}
          sx={{
            '.MuiInputBase-root': {
              fontWeight: 'bold',
            },
            ...titleFieldProps?.sx,
          }}
        />
        <PlainInput
          placeholder="Note"
          fullWidth
          multiline
          disableUnderline
          autoFocus
          {...contentFieldProps}
          sx={{
            flexGrow: 1,
            ...contentFieldProps.sx,
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
          slotProps={{
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
