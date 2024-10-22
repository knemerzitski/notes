import { ReactNode } from 'react';
import { useIsAppDrawerOpen, useSetAppDrawerOpen } from '../context/app-drawer-state';
import { isIOS } from '../../utils/is-ios';
import { css, styled, SwipeableDrawer as MuiSwipeableDrawer } from '@mui/material';
import { drawerPaddingStyle } from '../../layout/styles/drawer-padding';

const userAgentIOS = isIOS();

export function SwipeableDrawer({ children }: { children: ReactNode }) {
  const isOpen = useIsAppDrawerOpen();
  const setOpen = useSetAppDrawerOpen();

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <SwipeableDrawerStyled
      anchor="left"
      open={isOpen}
      onOpen={handleOpen}
      onClose={handleClose}
      disableBackdropTransition={!userAgentIOS}
      disableDiscovery={userAgentIOS}
      PaperProps={{
        elevation: 0,
      }}
    >
      {children}
    </SwipeableDrawerStyled>
  );
}

const SwipeableDrawerStyled = styled(MuiSwipeableDrawer)(
  ({ theme }) => css`
    .MuiDrawer-paper {
      ${drawerPaddingStyle({ theme })}
      width: 75%;
    }
  `
);
