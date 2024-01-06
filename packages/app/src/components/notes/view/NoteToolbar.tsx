import { Box, BoxProps } from '@mui/material';

import NoteMoreOptionsButton, { MoreOptionsButtonProps } from './NoteMoreOptionsButton';

interface ToolbarProps extends BoxProps {
  slotProps: {
    moreOptionsButton: MoreOptionsButtonProps;
  };
}

export default function NoteToolbar({ slotProps, ...restProps }: ToolbarProps) {
  return (
    <Box {...restProps}>
      <NoteMoreOptionsButton {...slotProps.moreOptionsButton} />
    </Box>
  );
}
