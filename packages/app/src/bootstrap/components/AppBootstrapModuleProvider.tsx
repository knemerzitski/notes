import { ReactNode } from 'react';
import { BootstrapCacheProvider } from '../context/bootstrap-cache';
import { bootstrapCache } from '../../bootstrap';

export function AppBootstrapModuleProvider({ children }: { children: ReactNode }) {
  return (
    <BootstrapCacheProvider storage={bootstrapCache}>{children}</BootstrapCacheProvider>
  );
}
