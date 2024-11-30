import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { SignedInUser } from '../../__generated__/graphql';
import { useApolloClient } from '@apollo/client';
import { getCurrentUserId } from '../../user/models/signed-in-user/get-current';

export interface FetchedRoutes {
  add: (routeId: string) => void;
  has: (routeId: string) => boolean;
  clear: (userId?: SignedInUser['id']) => void;
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
  const fetchedRoutesByUserRef = useRef<Map<SignedInUser['id'] | null, Set<string>>>(
    new Map()
  );
  const client = useApolloClient();

  const add = useCallback(
    (routeId: string) => {
      const userId = getCurrentUserId(client.cache) ?? null;

      let fetchedRoutes = fetchedRoutesByUserRef.current.get(userId);
      if (!fetchedRoutes) {
        fetchedRoutes = new Set();
        fetchedRoutesByUserRef.current.set(userId, fetchedRoutes);
      }

      fetchedRoutes.add(routeId);
    },
    [client]
  );

  const clear = useCallback(
    (userId = getCurrentUserId(client.cache) ?? null) => {
      const fetchedRoutes = fetchedRoutesByUserRef.current.get(userId);
      fetchedRoutes?.clear();
    },
    [client]
  );

  const clearAll = useCallback(() => {
    fetchedRoutesByUserRef.current.clear();
  }, []);

  const has = useCallback(
    (routeId: string) => {
      const userId = getCurrentUserId(client.cache) ?? null;

      const fetchedRoutes = fetchedRoutesByUserRef.current.get(userId);
      return fetchedRoutes?.has(routeId) ?? false;
    },
    [client]
  );

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
