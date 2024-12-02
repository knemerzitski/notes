import { ReactNode } from 'react';
import { BootstrapCacheProvider } from '../context/bootstrap-cache';
import { createDefaultBootstrapCache } from '..';

const bootstrapCache = createDefaultBootstrapCache();

export function AppBootstrapModuleProvider({ children }: { children: ReactNode }) {
  return (
    <BootstrapCacheProvider storage={bootstrapCache}>{children}</BootstrapCacheProvider>
  );
}
