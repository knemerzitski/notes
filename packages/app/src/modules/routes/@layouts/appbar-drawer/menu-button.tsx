import MenuIcon from '@mui/icons-material/Menu';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';

export function MenuButton(props: IconButtonProps) {
  return (
    <Tooltip title="Main Menu">
      <span>
        <IconButton color="inherit" aria-label="app menu" size="large" {...props}>
          <MenuIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
