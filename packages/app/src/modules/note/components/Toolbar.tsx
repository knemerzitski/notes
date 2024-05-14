import { Box, BoxProps } from '@mui/material';

import MoreOptionsButton, { MoreOptionsButtonProps } from './MoreOptionsButton';
import UndoButton from './UndoButton';
import RedoButton from './RedoButton';

export interface ToolbarProps {
  boxProps?: BoxProps;
  moreOptionsButtonProps?: MoreOptionsButtonProps;
  editing?: boolean;
}

export default function Toolbar({
  boxProps,
  moreOptionsButtonProps,
  editing,
}: ToolbarProps) {
  return (
    <Box {...boxProps}>
      <MoreOptionsButton {...moreOptionsButtonProps} />
      {editing && (
        <>
          <UndoButton />
          <RedoButton />
        </>
      )}
    </Box>
  );
}
