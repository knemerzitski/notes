import { ReactNode, createContext, useContext } from 'react';

import { ClientSession } from '../../__generated__/graphql';

const SessionContext = createContext<Omit<ClientSession, 'authProviderEntries'> | null>(
  null
);

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
  session: ClientSession;
  children: ReactNode;
}

export default function SessionProvider({ session, children }: SessionProviderProps) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
