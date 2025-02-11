import MenuIcon from '@mui/icons-material/Menu';
import { Tooltip, IconButton, IconButtonProps } from '@mui/material';

import { useSetAppDrawerOpen } from '../context/app-drawer-state';

export function ToggleAppDrawerButton({
  IconButtonProps,
}: {
  IconButtonProps?: Omit<IconButtonProps, 'color' | 'aria-label' | 'onClick'>;
}) {
  const setOpen = useSetAppDrawerOpen();

  function handleClick() {
    setOpen((prev) => !prev);
  }

  return (
    <IconButton
      size="large"
      {...IconButtonProps}
      aria-label="navigation menu"
      onClick={handleClick}
    >
      <Tooltip title="Navigation Menu">
        <MenuIcon />
      </Tooltip>
    </IconButton>
  );
}
