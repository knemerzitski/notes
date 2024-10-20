import { MenuItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { ColorModeText } from './ColorModeText';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useSelectNavigableMenu } from '../../utils/context/navigable-menu';
import { SettingsButtonMenuKey } from '../../utils/components/SettingsButton';
import { RightListItemIcon } from '../../utils/styled-components/RightListItemIcon';

export function ColorModeMenuItem() {
  const selectMenu = useSelectNavigableMenu();

  function handleClickItem() {
    selectMenu({ type: 'custom', value: 'appearance' satisfies SettingsButtonMenuKey });
  }

  return (
    <MenuItem aria-label="appearance" onClick={handleClickItem}>
      <ListItemIcon>
        <DarkModeIcon />
      </ListItemIcon>
      <ListItemText>
        <Typography variant="body2">
          Appearance: <ColorModeText />
        </Typography>
      </ListItemText>
      <RightListItemIcon>
        <NavigateNextIcon />
      </RightListItemIcon>
    </MenuItem>
  );
}
