import { useSuspenseQuery } from '@apollo/client';
import { ReactNode, createContext, useContext } from 'react';

import { Session } from '../__generated__/graphql';

import GET_SESSIONS from './graphql/GET_SESSIONS';

const SessionsContext = createContext<Session[] | null>(null);
const ActiveSessionIndexContext = createContext<number | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSessions(): Session[] {
  const ctx = useContext(SessionsContext);
  if (ctx === null) {
    throw new Error(
      'Error: useSessions() may be used only in the context of a <SessionsProvider> component.'
    );
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveSessionIndex(): number {
  const ctx = useContext(ActiveSessionIndexContext);
  if (ctx === null) {
    throw new Error(
      'Error: useActiveSessionIndex() may be used only in the context of a <SessionsProvider> component.'
    );
  }
  return ctx;
}

export function SessionsProvider({ children }: { children: ReactNode }) {
  const {
    data: { sessions, activeSessionIndex },
  } = useSuspenseQuery(GET_SESSIONS);

  return (
    <SessionsContext.Provider value={sessions}>
      <ActiveSessionIndexContext.Provider value={activeSessionIndex}>
        {children}
      </ActiveSessionIndexContext.Provider>
    </SessionsContext.Provider>
  );
}
