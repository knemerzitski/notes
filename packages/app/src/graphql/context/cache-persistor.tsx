import { NormalizedCacheObject } from '@apollo/client';
import { CachePersistor } from 'apollo3-cache-persist';
import { createContext, ReactNode, useContext } from 'react';
import { Maybe } from '~utils/types';

type ProvidedCachePersistor = Pick<
  CachePersistor<NormalizedCacheObject>,
  'persist' | 'isPending'
>;

const CachePersistorContext = createContext<ProvidedCachePersistor | null>(null);

export function useCachePersistor(nullable: true): Maybe<ProvidedCachePersistor>;
export function useCachePersistor(nullable?: false): ProvidedCachePersistor;
export function useCachePersistor(nullable?: boolean): Maybe<ProvidedCachePersistor> {
  const ctx = useContext(CachePersistorContext);
  if (ctx === null && !nullable) {
    throw new Error('useCachePersistor() requires context <CachePersistorProvider>');
  }
  return ctx;
}

export function CachePersistorProvider({
  persistor,
  children,
}: {
  persistor: ProvidedCachePersistor;
  children: ReactNode;
}) {
  return (
    <CachePersistorContext.Provider value={persistor}>
      {children}
    </CachePersistorContext.Provider>
  );
}
