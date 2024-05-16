import { ReactNode, createContext, useContext } from 'react';

const SessionPrefixContext = createContext<string | null>(null);

export function useSessionPrefix() {
  const ctx = useContext(SessionPrefixContext);
  if (ctx === null) {
    throw new Error('useSessionPrefix() requires context <SessionPrefixProvider>');
  }
  return ctx;
}

export default function SessionPrefixProvider({
  sessionPrefix,
  children,
}: {
  sessionPrefix: string;
  children: ReactNode;
}) {
  return (
    <SessionPrefixContext.Provider value={sessionPrefix}>
      {children}
    </SessionPrefixContext.Provider>
  );
}
