import { ApolloProvider } from '@apollo/client';
import { ReactNode } from 'react';

import { CachePersistorProvider } from '../context/cache-persistor';

import { CacheRestorerProvider } from '../context/cache-restorer';
import { GetMutationUpdaterFnProvider } from '../context/get-mutation-updater-fn';
import { PersistLinkProvider } from '../context/persist-link';
import { StatsLinkProvider } from '../context/stats-link';
import { GraphQLService } from '../types';

import { ConfirmLeaveOnPendingPersistCache } from './ConfirmLeaveOnPendingPersistCache';

import { RestorePersistedCache } from './RestorePersistedCache';
import { ResumePersistedOngoingOperations } from './ResumePersistedOngoingOperations';
import { CacheStatus } from './CacheStatus';

export function GraphQLServiceProvider({
  service,
  children,
  restoringCacheFallback,
}: {
  service: GraphQLService;
  children: ReactNode;
  restoringCacheFallback?: ReactNode;
}) {
  return (
    <ApolloProvider client={service.client}>
      <GetMutationUpdaterFnProvider getter={service.mutationUpdaterFnMap.get}>
        <PersistLinkProvider persistLink={service.links.persistLink}>
          <StatsLinkProvider statsLink={service.links.statsLink}>
            <CachePersistorProvider persistor={service.persistor}>
              <CacheStatus />
              <CacheRestorerProvider restorer={service.restorer}>
                <ConfirmLeaveOnPendingPersistCache triggerPersist={true} />
                <RestorePersistedCache fallback={restoringCacheFallback}>
                  <ResumePersistedOngoingOperations />
                  {children}
                </RestorePersistedCache>
              </CacheRestorerProvider>
            </CachePersistorProvider>
          </StatsLinkProvider>
        </PersistLinkProvider>
      </GetMutationUpdaterFnProvider>
    </ApolloProvider>
  );
}
