import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

import { User } from '../../__generated__/graphql';
import { useLogger } from '../../utils/context/logger';

export interface FetchedRoutes {
  add: (userId: User['id'], routeId: string) => void;
  has: (userId: User['id'], routeId: string) => boolean;
  clear: (userId: User['id']) => void;
  /**
   * Clear routes for all users
   */
  clearAll: () => void;
}

const FetchedRoutesContext = createContext<FetchedRoutes | null>(null);

export function useFetchedRoutes(): FetchedRoutes {
  const ctx = useContext(FetchedRoutesContext);
  if (ctx === null) {
    throw new Error('useFetchedRoutes() requires context <FetchedRoutesProvider>');
  }
  return ctx;
}

export function FetchedRoutesProvider({ children }: { children: ReactNode }) {
  const logger = useLogger('FetchedRoutesProvider');
  const fetchedRoutesByUserRef = useRef<Map<User['id'] | null, Set<string>>>(new Map());

  const add = useCallback(
    (userId: User['id'], routeId: string) => {
      let fetchedRoutes = fetchedRoutesByUserRef.current.get(userId);
      if (!fetchedRoutes) {
        fetchedRoutes = new Set();
        fetchedRoutesByUserRef.current.set(userId, fetchedRoutes);
      }

      fetchedRoutes.add(routeId);
      logger?.debug('add', {
        userId,
        routeId,
      });
    },
    [logger]
  );

  const clear = useCallback(
    (userId: User['id']) => {
      const fetchedRoutes = fetchedRoutesByUserRef.current.get(userId);
      fetchedRoutes?.clear();
      logger?.debug('clear', {
        userId,
      });
    },
    [logger]
  );

  const clearAll = useCallback(() => {
    fetchedRoutesByUserRef.current.clear();
    logger?.debug('clearAll');
  }, [logger]);

  const has = useCallback((userId: User['id'], routeId: string) => {
    const fetchedRoutes = fetchedRoutesByUserRef.current.get(userId);
    return fetchedRoutes?.has(routeId) ?? false;
  }, []);

  const fetchedRoutesInterface: FetchedRoutes = useMemo(
    () => ({
      add,
      clear,
      has,
      clearAll,
    }),
    [add, clear, has, clearAll]
  );

  return (
    <FetchedRoutesContext.Provider value={fetchedRoutesInterface}>
      {children}
    </FetchedRoutesContext.Provider>
  );
}
