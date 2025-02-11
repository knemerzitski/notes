import { ReactNode } from 'react';

import { useIsMobile } from '../../theme/context/is-mobile';

export function IsDesktop({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return children;
}
