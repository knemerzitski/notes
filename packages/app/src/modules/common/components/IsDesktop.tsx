import { ReactNode } from 'react';

import useIsMobile from '../hooks/useIsMobile';

export default function IsDesktop({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  if (isDesktop) return children;

  return null;
}
