import { Box, css, styled, Toolbar } from '@mui/material';
import { HeaderToolbar } from './HeaderToolbar';
import { AppBar } from './AppBar';
import { AppDrawer } from './AppDrawer';
import { DrawerNavigationList } from './DrawerNavigationList';
import { AppDrawerStateProvider } from '../context/app-drawer-state';
import { MainBox } from './MainBox';
import { ReactNode } from 'react';

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
