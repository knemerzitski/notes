import { useScrollTrigger, styled, AppBar as MuiAppBar, Theme, css } from '@mui/material';

import { forwardRef } from 'react';

import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

export const AppBar = forwardRef<HTMLElement, Parameters<typeof AppBarStyled>[0]>(
  function AppBar(props, ref) {
    const isNotAtTop = useScrollTrigger({
      disableHysteresis: true,
      threshold: 0,
    });

    return (
      <AppBarStyled
        position="fixed"
        elevation={0}
        showBoxShadow={isNotAtTop}
        {...props}
        ref={ref}
      />
    );
  }
);

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
    shadow = theme.shadows[showBoxShadow ? 5 : 0],
  }: {
    showBoxShadow?: boolean;
    shadow?: string | ((theme: Theme) => string);
  } & { theme: Theme }) => {
    const shadowValue = typeof shadow === 'function' ? shadow(theme) : shadow;

    return css`
      box-shadow: ${showBoxShadow ? shadowValue : theme.shadows[0]};
      transition: ${(theme.transitions.create('box-shadow'),
      {
        duration: theme.transitions.duration.shortest,
        easing: theme.transitions.easing.sharp,
      })};
    `;
  },
  props: ['showBoxShadow', 'shadow'],
};

const AppBarStyled = styled(MuiAppBar, {
  shouldForwardProp: mergeShouldForwardProp(shadowTransition.props),
})<{ showBoxShadow?: boolean; shadow?: string | ((theme: Theme) => string) }>(
  darkModeStyle,
  shadowTransition.style
);
