import { createContext, ReactNode, useContext } from 'react';

import { Maybe } from '../../../../utils/src/types';

import { StatsLink } from '../link/stats';

type ProvidedStatsLink = Pick<
  StatsLink,
  | 'subscribeToOngoingDocumentsByName'
  | 'subscribeToOngoingDocumentsCountByType'
  | 'subscribeToOngoingDocumentCount'
  | 'getOngoingDocumentCount'
>;

const StatsLinkContext = createContext<ProvidedStatsLink | null>(null);

export function useStatsLink(nullable: true): Maybe<ProvidedStatsLink>;
export function useStatsLink(nullable?: false): ProvidedStatsLink;
export function useStatsLink(nullable?: boolean): Maybe<ProvidedStatsLink> {
  const ctx = useContext(StatsLinkContext);
  if (ctx === null && !nullable) {
    throw new Error('useStatsLink() requires context <StatsLinkProvider>');
  }
  return ctx;
}

export function StatsLinkProvider({
  statsLink,
  children,
}: {
  statsLink: ProvidedStatsLink;
  children: ReactNode;
}) {
  return (
    <StatsLinkContext.Provider value={statsLink}>{children}</StatsLinkContext.Provider>
  );
}
