import { Box, css, styled, Toolbar } from '@mui/material';

import { ReactNode } from 'react';

import { AppDrawerStateProvider } from '../context/app-drawer-state';

import { AppBar } from './AppBar';
import { AppDrawer } from './AppDrawer';
import { DrawerNavigationList } from './DrawerNavigationList';
import { HeaderToolbar } from './HeaderToolbar';

import { MainBox } from './MainBox';

export function AppBarDrawerLayout({ children }: { children: ReactNode }) {
  return (
    <RootBoxStyled>
      <AppDrawerStateProvider>
        <AppBar>
          <HeaderToolbar />
        </AppBar>

        <AppDrawer>
          <Toolbar />
          <DrawerNavigationList />
        </AppDrawer>
      </AppDrawerStateProvider>

      <MainBox>
        <Toolbar />
        {children}
      </MainBox>
    </RootBoxStyled>
  );
}

const RootBoxStyled = styled(Box)(css`
  display: flex;
  justify-content: center;
  min-height: 100dvh;
`);
