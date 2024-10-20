import { MenuList } from '@mui/material';
import { ColorModeMenuItem } from '../../device-preferences/components/ColorModeMenuItem';

export function SettingsMenuList() {
  return (
    <MenuList>
      <ColorModeMenuItem />
    </MenuList>
  );
}
