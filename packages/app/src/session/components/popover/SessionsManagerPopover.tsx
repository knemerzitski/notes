import CloseIcon from '@mui/icons-material/Close';
import { Popover, IconButton, PopoverProps } from '@mui/material';

import SessionsManager from '../SessionsManager';

export interface SessionsManagementPopoverProps
  extends Omit<PopoverProps, 'open' | 'onClose'> {
  open: boolean;
  onClose?: () => void;
}

export default function SessionsManagementPopover({
  open,
  onClose,
  ...restProps
}: SessionsManagementPopoverProps) {
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
          // TODO check spacing with just value?
          top: theme.spacing(1),
        })}
      >
        <CloseIcon />
      </IconButton>

      <SessionsManager />
    </Popover>
  );
}
