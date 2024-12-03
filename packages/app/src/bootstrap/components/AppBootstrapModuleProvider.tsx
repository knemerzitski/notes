import { ReactNode } from 'react';

import { bootstrapCache } from '../../bootstrap';
import { BootstrapCacheProvider } from '../context/bootstrap-cache';

export function AppBootstrapModuleProvider({ children }: { children: ReactNode }) {
  return (
    <BootstrapCacheProvider storage={bootstrapCache}>{children}</BootstrapCacheProvider>
  );
}
