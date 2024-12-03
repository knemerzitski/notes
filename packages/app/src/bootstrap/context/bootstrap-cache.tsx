import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';

import { BootstrapCache } from '../utils/bootstrap-cache';

type ProvidedBootstrapCache = Pick<BootstrapCache, 'get' | 'set'>;

const BootstrapCacheContext = createContext<ProvidedBootstrapCache | null>(null);

export function useBootstrapCache(nullable: true): Maybe<ProvidedBootstrapCache>;
export function useBootstrapCache(nullable?: false): ProvidedBootstrapCache;
export function useBootstrapCache(nullable?: boolean): Maybe<ProvidedBootstrapCache> {
  const ctx = useContext(BootstrapCacheContext);
  if (ctx === null && !nullable) {
    throw new Error('useBootstrapCache() requires context <BootstrapCacheProvider>');
  }
  return ctx;
}

export function BootstrapCacheProvider({
  storage,
  children,
}: {
  storage: ProvidedBootstrapCache;
  children: ReactNode;
}) {
  return (
    <BootstrapCacheContext.Provider value={storage}>
      {children}
    </BootstrapCacheContext.Provider>
  );
}
