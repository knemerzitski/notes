import { Box, Toolbar } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import AppBarContent from '../../appbar/AppBarContent';
import AppBar from '../../appbar/components/AppBar';
import { DrawerContent } from '../../drawer/DrawerContent';
import Drawer from '../../drawer/components/Drawer';
import useIsMobile from '../../hooks/useIsMobile';

export default function MainLayout() {
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
          slotProps={{
            menuButton: {
              onClick: toggleDrawer,
            },
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
