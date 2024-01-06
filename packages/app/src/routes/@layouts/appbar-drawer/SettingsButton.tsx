import SettingsIcon from '@mui/icons-material/Settings';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  useTheme,
  IconButtonProps,
} from '@mui/material';
import { useId, useState } from 'react';

import useColorMode from '../../../local-state/preferences/hooks/useColorMode';

export default function SettingsButton(props: IconButtonProps) {
  const {
    operations: { toggleColorMode },
  } = useColorMode();
  const theme = useTheme();

  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const menuOpen = Boolean(anchorEl);

  return (
    <>
      <IconButton
        id={buttonId}
        color="inherit"
        aria-label="app options menu"
        size="large"
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        {...props}
      >
        <SettingsIcon />
      </IconButton>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => {
          setAnchorEl(null);
        }}
        disableScrollLock
        MenuListProps={{
          'aria-labelledby': anchorEl?.id,
        }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            toggleColorMode();
          }}
        >
          <ListItemText>{`${
            theme.palette.mode === 'light' ? 'Enable' : 'Disable'
          } dark theme`}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}