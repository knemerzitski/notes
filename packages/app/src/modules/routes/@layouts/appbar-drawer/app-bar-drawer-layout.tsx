import { Box, Toolbar } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AppBar } from '../../../common/components/app-bar';
import { Drawer } from '../../../common/components/drawer';
import { useIsMobile } from '../../../common/hooks/use-is-mobile';

import { AppBarContent } from './app-bar-content';
import { DrawerContent } from './drawer-content';

export function AppBarDrawerLayout() {
  const isMobile = useIsMobile();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  function handleOpenDrawer() {
    setIsDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false);
  }

  function toggleDrawer() {
    setIsDrawerOpen((prev) => !prev);
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100dvh',
      }}
    >
      <AppBar slideIn={isDrawerOpen}>
        <AppBarContent
          menuButtonProps={{
            onClick: toggleDrawer,
          }}
        />
      </AppBar>

      <Drawer open={isDrawerOpen} onOpen={handleOpenDrawer} onClose={handleCloseDrawer}>
        <Toolbar />
        <DrawerContent onClose={handleCloseDrawer} />
      </Drawer>

      <Box
        component="main"
        sx={{
          width: '100%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: {
            xs: 1,
            sm: 2,
            md: 3,
          },
          gap: isMobile ? 2 : 4,
          mb: 5,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
