import { Toolbar, Box, IconButtonProps, ToolbarProps } from '@mui/material';

import SessionsManagerButton from '../../../session/components/popover/SessionsManagerPopoverButton';

import MenuButton from './MenuButton';
import SettingsButton from './SettingsButton';
import SyncStatusButton from './SyncStatusButton';

interface AppBarContentProps extends ToolbarProps {
  slotProps?: {
    menuButton?: IconButtonProps;
  };
}

export default function AppBarContent({ slotProps, ...restProps }: AppBarContentProps) {
  const buttonSizePx = 24;
  const buttonSize = 'medium';
  const gapSpacing = 0.5;

  return (
    <Toolbar {...restProps} sx={{ justifyContent: 'space-between', ...restProps.sx }}>
      <MenuButton edge="start" {...slotProps?.menuButton} />
      <Box>
        <SyncStatusButton
          fontSize={buttonSizePx}
          size={buttonSize}
          sx={{ mr: gapSpacing }}
        />
        <SettingsButton size={buttonSize} sx={{ mr: gapSpacing }} />
        <SessionsManagerButton
          buttonProps={{
            edge: 'end',
            size: 'medium',
          }}
          popoverProps={{
            keepMounted: true,
            transformOrigin: {
              vertical: 'top',
              horizontal: 'right',
            },
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'right',
            },
          }}
        />
      </Box>
    </Toolbar>
  );
}
