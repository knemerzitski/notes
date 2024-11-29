import MenuIcon from '@mui/icons-material/Menu';
import { Tooltip, IconButton, IconButtonProps } from '@mui/material';
import { useSetAppDrawerOpen } from '../context/app-drawer-state';

export function ToggleAppDrawerButton({
  IconButtonProps,
}: {
  IconButtonProps?: Omit<IconButtonProps, 'color' | 'aria-label' | 'size' | 'onClick'>;
}) {
  const setOpen = useSetAppDrawerOpen();

  function handleClick() {
    setOpen((prev) => !prev);
  }

  return (
    <IconButton
      {...IconButtonProps}
      aria-label="navigation menu"
      size="large"
      onClick={handleClick}
    >
      <Tooltip title="Navigation Menu">
        <MenuIcon />
      </Tooltip>
    </IconButton>
  );
}
