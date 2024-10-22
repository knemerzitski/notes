import { css, Drawer, DrawerProps, styled, Theme, useTheme } from '@mui/material';
import { useDebouncedCallback } from 'use-debounce';
import {
  useIsAppDrawerFloating,
  useIsAppDrawerOpen,
  useSetAppDrawerFloating,
  useSetAppDrawerOpen,
} from '../context/app-drawer-state';
import { ReactNode } from 'react';
import { drawerPaddingStyle } from '../styles/drawer-padding';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

export function FixedWidthFloatableDrawer({
  width = 240,
  floatDelay,
  children,
}: {
  width?: number;
  floatDelay?: number;
  paddingX?: number;
  children: ReactNode;
}) {
  const isOpen = useIsAppDrawerOpen();
  const isFloating = useIsAppDrawerFloating();
  const setOpen = useSetAppDrawerOpen();
  const setFloating = useSetAppDrawerFloating();
  const theme = useTheme();

  floatDelay = floatDelay ?? theme.transitions.duration.standard;

  const hoverFloatingOpenDebounce = useDebouncedCallback(() => {
    setFloating(true);
  }, floatDelay);

  if (isOpen) {
    hoverFloatingOpenDebounce.cancel();
  }

  function handleMouseEnter() {
    if (!isOpen) {
      hoverFloatingOpenDebounce();
    }
  }

  function handleMouseLeave() {
    hoverFloatingOpenDebounce.cancel();
    setFloating(false);
  }

  function handleClose() {
    setOpen(false);
  }

  const isExpanded = isOpen || isFloating;

  return (
    <DrawerStyled
      variant="permanent"
      open={isExpanded}
      floating={isFloating}
      onClose={handleClose}
      PaperProps={{
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      }}
      width={width}
    >
      {children}
    </DrawerStyled>
  );
}

const drawerBaseStyle = ({ theme }: { theme: Theme }) => {
  return css`
    ${drawerPaddingStyle({ theme })}

    transition: ${theme.transitions.create(['width', 'box-shadow'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shortest,
    })};
  `;
};

const drawerOpen = {
  style: ({ width = 240 }: { width?: number }) => {
    return css`
      width: ${width}px;
    `;
  },
  props: ['width'],
};

const drawerClosedStyle = ({ theme }: { theme: Theme }) => {
  return css`
    ${theme.breakpoints.up('xs')} {
      width: ${theme.spacing(7)};
    }
    ${theme.breakpoints.up('sm')} {
      width: ${theme.spacing(9)};
    }
  `;
};

const DrawerStyled = styled(Drawer, {
  shouldForwardProp: mergeShouldForwardProp(drawerOpen.props, ['floating']),
})<
  { floating?: boolean } & DrawerProps &
    Omit<Parameters<typeof drawerOpen.style>[0], 'theme'>
>(
  ({ theme }) => {
    return css`
      ${drawerBaseStyle({ theme })}
      .MuiDrawer-paper {
        border: none;
        ${drawerBaseStyle({ theme })}
      }
    `;
  },
  ({ theme, open = false, floating = false, width }) => {
    if (open) {
      if (floating) {
        return css`
          ${drawerClosedStyle({ theme })}
          .MuiDrawer-paper {
            box-shadow: ${theme.shadows['5']};
            ${drawerOpen.style({ width })}
          }
        `;
      }

      return css`
        ${drawerOpen.style({ width })}
        .MuiDrawer-paper {
          ${drawerOpen.style({ width })}
        }
      `;
    }

    // closed
    return css`
      ${drawerClosedStyle({ theme })}
      .MuiDrawer-paper {
        ${drawerClosedStyle({ theme })}
      }
    `;
  }
);
