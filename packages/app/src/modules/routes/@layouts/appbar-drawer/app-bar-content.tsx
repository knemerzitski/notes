import { Toolbar, Box, IconButtonProps, ToolbarProps } from '@mui/material';

import { UserContainerPopoverButton } from '../../../auth/components/user-container-popover-button';

import { MenuButton } from './menu-button';
import { SettingsButton } from './settings-button';
import { SyncStatusButton } from './sync-status-button';

interface AppBarContentProps extends ToolbarProps {
  menuButtonProps?: IconButtonProps;
}

export function AppBarContent({
  menuButtonProps,
  ...restProps
}: AppBarContentProps) {
  const buttonSizePx = 24;
  const buttonSize = 'medium';
  const gapSpacing = 0.5;

  return (
    <Toolbar {...restProps} sx={{ justifyContent: 'space-between', ...restProps.sx }}>
      <MenuButton edge="start" {...menuButtonProps} />
      <Box>
        <SyncStatusButton
          fontSize={buttonSizePx}
          size={buttonSize}
          sx={{ mr: gapSpacing }}
        />
        <SettingsButton size={buttonSize} sx={{ mr: gapSpacing }} />
        <UserContainerPopoverButton
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
