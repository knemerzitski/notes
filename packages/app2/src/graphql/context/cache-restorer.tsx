import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';
import { CacheRestorer } from '../utils/cache-restorer';

type ProvidedCacheRestorer = Pick<CacheRestorer, 'restore' | 'status'>;

const CacheRestorerContext = createContext<ProvidedCacheRestorer | null>(null);

export function useCacheRestorer(nullable: true): Maybe<ProvidedCacheRestorer>;
export function useCacheRestorer(nullable?: false): ProvidedCacheRestorer;
export function useCacheRestorer(nullable?: boolean): Maybe<ProvidedCacheRestorer> {
  const ctx = useContext(CacheRestorerContext);
  if (ctx === null && !nullable) {
    throw new Error('useCacheRestorer() requires context <CacheRestorerProvider>');
  }
  return ctx;
}

export function CacheRestorerProvider({
  restorer,
  children,
}: {
  restorer: ProvidedCacheRestorer;
  children: ReactNode;
}) {
  return (
    <CacheRestorerContext.Provider value={restorer}>
      {children}
    </CacheRestorerContext.Provider>
  );
}
