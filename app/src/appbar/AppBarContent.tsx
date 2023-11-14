import { Toolbar, Box, IconButtonProps, ToolbarProps } from '@mui/material';

import AccountButton from './AccountButton';
import MenuButton from './MenuButton';
import SettingsButton from './SettingsButton';

interface AppBarContentProps extends ToolbarProps {
  slotProps?: {
    menuButton?: IconButtonProps;
  };
}

export default function AppBarContent({ slotProps, ...restProps }: AppBarContentProps) {
  return (
    <Toolbar {...restProps} sx={{ justifyContent: 'space-between', ...restProps.sx }}>
      <MenuButton edge="start" {...slotProps?.menuButton} />
      <Box>
        <SettingsButton sx={{ mr: 1 }} />
        <AccountButton edge="end" />
      </Box>
    </Toolbar>
  );
}
