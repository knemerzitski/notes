import SettingsIcon from '@mui/icons-material/Settings';
import { IconButtonMenu } from './IconButtonMenu';
import { Tooltip } from '@mui/material';
import { NavigableMenuProvider } from '../context/navigable-menu';
import { SettingsMenuList } from './SettingsMenuList';
import { ColorModeMenuList } from '../../device-preferences/components/ColorModeMenuList';

export type SettingsButtonMenuKey = 'root' | 'appearance';

const menusInfo: Parameters<typeof NavigableMenuProvider>[0]['menuSchema'] = [
  {
    key: 'root' satisfies SettingsButtonMenuKey,
    element: <SettingsMenuList />,
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
