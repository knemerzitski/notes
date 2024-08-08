import { Drawer as MuiDrawer, DrawerProps as MuiDrawerProps, Theme } from '@mui/material';
import { useRef } from 'react';

interface FixedWidthDrawerProps extends MuiDrawerProps {
  width: number;
  open?: boolean;
  floatingOpen?: boolean;
  onFloatingOpen?: () => void;
  onFloatingClose?: () => void;
  floatingOpenDelay?: number;
  paddingX?: number;
}

export function FixedWidthDrawer({
  width = 240,
  open = true,
  floatingOpen = false,
  onFloatingOpen = () => {
    return;
  },
  onFloatingClose = () => {
    return;
  },
  floatingOpenDelay = 0,
  paddingX = 1.5,
  ...restProps
}: FixedWidthDrawerProps) {
  const hoverOpenTimeoutIdRef = useRef<ReturnType<typeof setTimeout>>();

  function handleMouseEnter() {
    if (!open) {
      clearTimeout(hoverOpenTimeoutIdRef.current);
      hoverOpenTimeoutIdRef.current = setTimeout(() => {
        onFloatingOpen();
      }, floatingOpenDelay);
    }
  }

  function handleMouseLeave() {
    clearTimeout(hoverOpenTimeoutIdRef.current);
    onFloatingClose();
  }

  return (
    <MuiDrawer
      {...restProps}
      PaperProps={{
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        sx: {
          border: 'none',
          ...restProps.PaperProps?.sx,
        },
        ...restProps.PaperProps,
      }}
      sx={(theme) => ({
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...(floatingOpen
          ? {
              ...closedMixin(theme, paddingX), // keep drawer width small
              '.MuiDrawer-paper': {
                boxShadow: 5,
                ...openedMixin(theme, width, paddingX), // show drawer on top of content (floating)
              },
            }
          : {
              ...(open && {
                ...openedMixin(theme, width, paddingX),
                '.MuiDrawer-paper': openedMixin(theme, width, paddingX),
              }),
              ...(!open && {
                ...closedMixin(theme, paddingX),
                '.MuiDrawer-paper': closedMixin(theme, paddingX),
              }),
            }),
      })}
    />
  );
}

function openedMixin(theme: Theme, width: number, paddingX: number) {
  return {
    width,
    px: {
      xs: Math.max(0, paddingX - 0.5),
      sm: paddingX,
    },
    transition: theme.transitions.create(['width', 'box-shadow'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shortest,
    }),
  };
}

function closedMixin(theme: Theme, paddingX: number) {
  return {
    width: {
      // Enough padding for a medium icon
      xs: theme.spacing(6 + Math.max(0, 2 * (paddingX - 0.5))),
      sm: theme.spacing(6 + 2 * paddingX),
    },
    px: {
      xs: Math.max(0, paddingX - 0.5),
      sm: paddingX,
    },
    transition: theme.transitions.create(['width', 'box-shadow'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shortest,
    }),
  };
}
