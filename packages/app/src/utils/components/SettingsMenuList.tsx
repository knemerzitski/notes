import { MenuList } from '@mui/material';
import { ColorModeMenuItem } from '../../device-preferences/components/ColorModeMenuItem';
import { LayoutModeMenuItem } from '../../device-preferences/components/LayoutModeMenuItem';

export function SettingsMenuList() {
  return (
    <MenuList>
      <LayoutModeMenuItem />
      <ColorModeMenuItem />
    </MenuList>
  );
}
