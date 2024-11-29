import { ReactNode } from 'react';
import { useIsMobile } from '../../theme/context/is-mobile';
import { FixedWidthFloatableDrawer } from './FixedWidthFloatableDrawer';
import { SwipeableDrawer } from './SwipeableDrawer';

export function AppDrawer({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <SwipeableDrawer>{children}</SwipeableDrawer>;
  }

  return <FixedWidthFloatableDrawer>{children}</FixedWidthFloatableDrawer>;
}
