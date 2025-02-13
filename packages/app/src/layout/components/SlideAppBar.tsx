import { useScrollTrigger, Slide, AppBarProps } from '@mui/material';

import { ReactNode } from 'react';

import { useIsAnyNoteSelected } from '../../note/hooks/useIsAnyNoteSelected';
import { useIsMobile } from '../../theme/context/is-mobile';
import { useIsAppDrawerOpen } from '../context/app-drawer-state';

import { AppBar } from './AppBar';

export function SlideAppBar({
  AppBarProps,
  children,
}: {
  AppBarProps?: Omit<AppBarProps, 'children' | 'elevation' | 'position'>;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();

  const isScrollingDown = useScrollTrigger();

  const isAppDrawerOpen = useIsAppDrawerOpen();

  const isAnyNoteSelected = useIsAnyNoteSelected();

  return (
    <Slide
      appear={false}
      direction="down"
      in={!isMobile || !isScrollingDown || isAppDrawerOpen || isAnyNoteSelected}
    >
      <AppBar {...AppBarProps} position="fixed" elevation={0}>
        {children}
      </AppBar>
    </Slide>
  );
}
