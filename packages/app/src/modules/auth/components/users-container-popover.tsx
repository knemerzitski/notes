import CloseIcon from '@mui/icons-material/Close';
import { Popover, IconButton, PopoverProps } from '@mui/material';

import { UsersContainer } from './users-container';

export interface UsersContainerPopoverProps
  extends Omit<PopoverProps, 'open' | 'onClose'> {
  open: boolean;
  onClose?: () => void;
}

export function UsersContainerPopover({
  open,
  onClose,
  ...restProps
}: UsersContainerPopoverProps) {
  return (
    <Popover
      open={open}
      onClose={onClose}
      disableScrollLock
      {...restProps}
      slotProps={{
        ...restProps.slotProps,
        paper: {
          elevation: 10,
          sx: {
            py: 2,
            borderRadius: 3,
            width: 'min(400px, 100vw)',
          },
          ...restProps.slotProps?.paper,
        },
      }}
    >
      <IconButton
        color="inherit"
        aria-label="close account options"
        onClick={onClose}
        sx={(theme) => ({
          position: 'absolute',
          right: theme.spacing(1),
          top: theme.spacing(1),
        })}
      >
        <CloseIcon />
      </IconButton>

      <UsersContainer />
    </Popover>
  );
}
