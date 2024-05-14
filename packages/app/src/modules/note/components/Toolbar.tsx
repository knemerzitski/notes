import { Box, BoxProps } from '@mui/material';

import MoreOptionsButton, { MoreOptionsButtonProps } from './MoreOptionsButton';

export interface ToolbarProps {
  boxProps?: BoxProps;
  moreOptionsButtonProps?: MoreOptionsButtonProps;
}

export default function Toolbar({ boxProps, moreOptionsButtonProps }: ToolbarProps) {
  return (
    <Box {...boxProps}>
      <MoreOptionsButton {...moreOptionsButtonProps} />
    </Box>
  );
}
