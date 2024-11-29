import {
  useScrollTrigger,
  Slide,
  AppBarProps,
  styled,
  AppBar as MuiAppBar,
  Theme,
  css,
} from '@mui/material';
import { useIsMobile } from '../../theme/context/is-mobile';
import { ReactNode } from 'react';
import { useIsAppDrawerOpen } from '../context/app-drawer-state';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

export function AppBar({
  AppBarProps,
  children,
}: {
  AppBarProps?: Omit<AppBarProps, 'children' | 'elevation' | 'position'>;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();

  const isNotAtTop = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  const isScrollingDown = useScrollTrigger();

  const isAppDrawerOpen = useIsAppDrawerOpen();

  return (
    <Slide
      appear={false}
      direction="down"
      in={!isMobile || !isScrollingDown || isAppDrawerOpen}
    >
      <AppBarStyled
        {...AppBarProps}
        position="fixed"
        elevation={0}
        showBoxShadow={isNotAtTop}
      >
        {children}
      </AppBarStyled>
    </Slide>
  );
}

const darkModeStyle = ({ theme }: { theme: Theme }) => {
  if (theme.palette.mode !== 'dark') {
    return;
  }

  return css`
    border-bottom: 1px solid ${theme.palette.divider};
  `;
};

const shadowTransition = {
  style: ({
    showBoxShadow,
    theme,
  }: {
    showBoxShadow?: boolean;
  } & { theme: Theme }) => {
    return css`
      box-shadow: ${theme.shadows[showBoxShadow ? 5 : 0]};
      transition: ${(theme.transitions.create('box-shadow'),
      {
        duration: theme.transitions.duration.shortest,
        easing: theme.transitions.easing.sharp,
      })};
    `;
  },
  props: ['showBoxShadow'],
};

const AppBarStyled = styled(MuiAppBar, {
  shouldForwardProp: mergeShouldForwardProp(shadowTransition.props),
})(darkModeStyle, shadowTransition.style);
