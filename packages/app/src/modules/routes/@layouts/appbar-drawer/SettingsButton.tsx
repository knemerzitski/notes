import SettingsIcon from '@mui/icons-material/Settings';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  IconButtonProps,
  ListItemIcon,
  MenuList,
  Typography,
} from '@mui/material';
import { useId, useState } from 'react';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AppearanceText from '../../../theme/components/AppearanceText';
import AppearanceMenu from '../../../theme/components/AppearanceMenu';

type SubMenu = 'appearance' | null;

export default function SettingsButton(props: IconButtonProps) {
  const buttonId = useId();
  const menuId = useId();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const menuOpen = Boolean(anchorEl);

  const [subMenu, setSubMenu] = useState<SubMenu>(null);

  return (
    <>
      <IconButton
        id={buttonId}
        color="inherit"
        aria-label="app options menu"
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
        onTransitionExited={() => {
          setSubMenu(null);
        }}
        disableScrollLock
        MenuListProps={{
          'aria-labelledby': anchorEl?.id,
        }}
      >
        {!subMenu ? (
          <MenuList>
            <MenuItem
              onClick={() => {
                setSubMenu('appearance');
              }}
              aria-label="appearance"
            >
              <ListItemIcon>
                <DarkModeIcon />
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2">
                  <AppearanceText />
                </Typography>
              </ListItemText>
              <ListItemIcon
                sx={{
                  justifyContent: 'right',
                }}
              >
                <NavigateNextIcon />
              </ListItemIcon>
            </MenuItem>
          </MenuList>
        ) : (
          <AppearanceMenu
            onClickBack={() => {
              setSubMenu(null);
            }}
            onSelected={() => {
              setAnchorEl(null);
            }}
          />
        )}
      </Menu>
    </>
  );
}
