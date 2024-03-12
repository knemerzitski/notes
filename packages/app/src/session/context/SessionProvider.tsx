import { ReactNode, createContext, useContext } from 'react';

import { SavedSession } from '../../__generated__/graphql';

const SessionContext = createContext<SavedSession | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const ctx = useContext(SessionContext);
  if (ctx === null) {
    throw new Error('useSession() requires context <SessionProvider>');
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSessionMaybe() {
  return useContext(SessionContext);
}

interface SessionProviderProps {
  session: SavedSession;
  children: ReactNode;
}

export default function SessionProvider({ session, children }: SessionProviderProps) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
