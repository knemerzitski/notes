import { ReactNode } from '@tanstack/react-router';
import { useLayoutMode } from '../../device-preferences/hooks/useLayoutMode';
import { LayoutMode } from '../../__generated__/graphql';
import { BreakpointDownIsMobile } from './BreakpointDownIsMobile';
import { IsMobileProvider } from '../context/is-mobile';

export function ResponsiveIsMobile({ children }: { children: ReactNode }) {
  const [layoutMode] = useLayoutMode();

  if (layoutMode !== LayoutMode.RESPONSIVE) {
    return (
      <IsMobileProvider isMobile={layoutMode === LayoutMode.MOBILE}>
        {children}
      </IsMobileProvider>
    );
  }

  return <BreakpointDownIsMobile breakpointDown="sm">{children}</BreakpointDownIsMobile>;
}
