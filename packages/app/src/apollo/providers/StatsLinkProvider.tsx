import { createContext, useContext, ReactNode } from 'react';

import StatsLink from '../links/StatsLink';

const StatsLinkContext = createContext<StatsLink | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useApolloClientStatsLink() {
  const ctx = useContext(StatsLinkContext);
  if (ctx === null) {
    throw new Error(
      'Error: useApolloClientStatsLink() may be used only in the context of a <ApolloStatsLinkProvider> component.'
    );
  }
  return ctx;
}

export function ApolloStatsLinkProvider({
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
