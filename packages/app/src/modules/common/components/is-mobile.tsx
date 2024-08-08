import { ReactNode } from 'react';

import { useIsMobile } from '../hooks/use-is-mobile';

export function IsMobile({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) return children;

  return null;
}
