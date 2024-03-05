import { Toolbar, Box, IconButtonProps, ToolbarProps } from '@mui/material';

import AccountButton from './AccountButton';
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
  const accountButtonSize = 'medium';
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
        <AccountButton edge="end" size={accountButtonSize} />
      </Box>
    </Toolbar>
  );
}
