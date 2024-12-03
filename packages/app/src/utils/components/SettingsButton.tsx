import SettingsIcon from '@mui/icons-material/Settings';

import { Tooltip } from '@mui/material';

import { ColorModeMenuList } from '../../device-preferences/components/ColorModeMenuList';
import { LayoutMenuList } from '../../device-preferences/components/LayoutMenuList';
import { NavigableMenuProvider } from '../context/navigable-menu';

import { IconButtonMenu } from './IconButtonMenu';
import { SettingsMenuList } from './SettingsMenuList';

export type SettingsButtonMenuKey = 'root' | 'appearance' | 'layout';

const menusInfo: Parameters<typeof NavigableMenuProvider>[0]['menuSchema'] = [
  {
    key: 'root' satisfies SettingsButtonMenuKey,
    element: <SettingsMenuList />,
  },
  {
    key: 'layout' satisfies SettingsButtonMenuKey,
    title: 'Layout',
    element: <LayoutMenuList />,
  },
  {
    key: 'appearance' satisfies SettingsButtonMenuKey,
    title: 'Appearance',
    element: <ColorModeMenuList />,
  },
];

export function SettingsButton() {
  return (
    <IconButtonMenu
      aria-label="app settings menu"
      slotProps={{
        iconButton: {
          children: (
            <Tooltip title="Settings">
              <SettingsIcon />
            </Tooltip>
          ),
        },
      }}
    >
      <NavigableMenuProvider menuSchema={menusInfo} />
    </IconButtonMenu>
  );
}
