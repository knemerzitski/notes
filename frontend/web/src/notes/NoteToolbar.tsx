import { Box, BoxProps } from '@mui/material';

import NoteMoreOptionsButton, { MoreOptionsButtonProps } from './NoteMoreOptionsButton';

interface ToolbarProps extends BoxProps {
  slots?: {
    moreOptionsButton?: MoreOptionsButtonProps;
  };
}

export default function NoteToolbar({ slots, ...restProps }: ToolbarProps) {
  return (
    <Box {...restProps}>
      <NoteMoreOptionsButton {...slots?.moreOptionsButton} />
    </Box>
  );
}
