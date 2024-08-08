import { createContext, useContext, ReactNode } from 'react';

import { StatsLink } from '../links/stats-link';

const StatsLinkContext = createContext<StatsLink | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useStatsLink() {
  const ctx = useContext(StatsLinkContext);
  if (ctx === null) {
    throw new Error('useStatsLink() requires context <ApolloStatsLinkProvider>');
  }
  return ctx;
}

export function StatsLinkProvider({
  children,
  statsLink,
}: {
  children: ReactNode;
  statsLink: StatsLink;
}) {
  return (
    <StatsLinkContext.Provider value={statsLink}>{children}</StatsLinkContext.Provider>
  );
}
