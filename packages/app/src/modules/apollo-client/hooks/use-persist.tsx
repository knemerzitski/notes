import { CachePersistor } from 'apollo3-cache-persist';
import { createContext, useContext, ReactNode, useCallback } from 'react';

const PersistContext = createContext<(() => Promise<void>) | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function usePersist() {
  const ctx = useContext(PersistContext);
  if (ctx === null) {
    throw new Error('usePersist() requires context <PersistProvider>');
  }
  return ctx;
}

export function PersistProvider<TCacheShape>({
  children,
  persistor,
}: {
  children: ReactNode;
  persistor: Pick<CachePersistor<TCacheShape>, 'persist'>;
}) {
  const persist = useCallback(() => {
    return persistor.persist();
  }, [persistor]);

  return <PersistContext.Provider value={persist}>{children}</PersistContext.Provider>;
}
