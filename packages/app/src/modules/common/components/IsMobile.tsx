import { ReactNode } from 'react';

import useIsMobile from '../hooks/useIsMobile';

export default function IsMobile({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) return children;

  return null;
}
