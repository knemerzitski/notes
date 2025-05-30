import { Box, css, styled, Toolbar } from '@mui/material';

import { ReactNode } from 'react';

import { gql } from '../../__generated__';
import { AppDrawerStateProvider } from '../context/app-drawer-state';

import { AppDrawer } from './AppDrawer';
import { DrawerNavigationList } from './DrawerNavigationList';
import { HeaderToolbar } from './HeaderToolbar';

import { MainBox } from './MainBox';
import { SlideAppBar } from './SlideAppBar';

const _AppBarDrawerLayout_UserFragment = gql(`
  fragment AppBarDrawerLayout_UserFragment on User {
    ...HeaderToolbar_UserFragment
  }
`);

export function AppBarDrawerLayout({ children }: { children: ReactNode }) {
  return (
    <RootBoxStyled>
      <AppDrawerStateProvider>
        <SlideAppBar>
          <HeaderToolbar />
        </SlideAppBar>

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
