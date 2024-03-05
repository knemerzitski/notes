import { createContext, useContext, ReactNode } from 'react';

import StatsLink from '../links/stats-link';

// TODO move to apollo/hooks and rename to useApolloClientStatsLink

const StatsLinkContext = createContext<StatsLink | null>(null);

// TODO set this function as default export
// eslint-disable-next-line react-refresh/only-export-components
export default function useApolloClientStatsLink() {
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
