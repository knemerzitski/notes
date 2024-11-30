import { Breakpoint, useMediaQuery, useTheme } from '@mui/material';
import { ReactNode } from '@tanstack/react-router';
import { IsMobileProvider } from '../context/is-mobile';

export function BreakpointDownIsMobile({
  breakpointDown,
  children,
}: {
  /**
   * Breakpoint or smaller when to switch to mobile layout.
   */
  breakpointDown: Breakpoint;
  children: ReactNode;
}) {
  const theme = useTheme();
  const isBreakpointOrSmaller = useMediaQuery(theme.breakpoints.down(breakpointDown));

  return <IsMobileProvider isMobile={isBreakpointOrSmaller}>{children}</IsMobileProvider>;
}
