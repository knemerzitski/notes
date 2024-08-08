import {
  useTheme,
  DrawerProps as MuiDrawerProps,
  SwipeableDrawer,
  SwipeableDrawerProps,
} from '@mui/material';
import { createContext, useContext, useState } from 'react';

import { useIsMobile as useMobile } from '../hooks/use-is-mobile';
import { isIOS } from '../utils/user-agent';

import { FixedWidthDrawer } from './fixed-width-drawer';

const DrawerExpandedContext = createContext<boolean | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useDrawerExpanded() {
  const ctx = useContext(DrawerExpandedContext);
  if (ctx === null) {
    throw new Error(
      'useDrawerExpanded() may be used only in the context of a <Drawer> component.'
    );
  }
  return ctx;
}

export function Drawer({
  open,
  onOpen,
  onClose,
  children,
  ...restProps
}: SwipeableDrawerProps & MuiDrawerProps) {
  const theme = useTheme();
  const mobile = useMobile();
  const userAgentIOS = isIOS();

  const [floatingOpen, setFloatingOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const drawerExpanded = open || floatingOpen;

  return (
    <DrawerExpandedContext.Provider value={drawerExpanded}>
      {mobile ? (
        <SwipeableDrawer
          anchor="left"
          open={open}
          onOpen={onOpen}
          onClose={onClose}
          disableBackdropTransition={!userAgentIOS}
          disableDiscovery={userAgentIOS}
          {...restProps}
          PaperProps={{
            elevation: 0,
            ...restProps.PaperProps,
            sx: {
              width: '75%',
              ...restProps.PaperProps?.sx,
            },
          }}
        >
          {children}
        </SwipeableDrawer>
      ) : (
        <FixedWidthDrawer
          variant="permanent"
          width={240}
          open={open}
          onClose={onClose}
          floatingOpen={floatingOpen}
          floatingOpenDelay={theme.transitions.duration.standard}
          onFloatingOpen={() => {
            setFloatingOpen(true);
          }}
          onFloatingClose={() => {
            setFloatingOpen(false);
          }}
          {...restProps}
        >
          {children}
        </FixedWidthDrawer>
      )}
    </DrawerExpandedContext.Provider>
  );
}
