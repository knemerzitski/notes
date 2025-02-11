import { ReactNode } from 'react';

import { useIsMobile } from '../../theme/context/is-mobile';

export function IsMobile({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  return children;
}
