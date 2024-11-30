/* eslint-disable unicorn/filename-case */
import { ReactNode } from 'react';
import { GraphQLService } from '../types';
import { PersistLinkProvider } from '../context/persist-link';
import { ResumePersistedOngoingOperations } from './ResumePersistedOngoingOperations';
import { GetMutationUpdaterFnProvider } from '../context/get-mutation-updater-fn';
import { ApolloProvider } from '@apollo/client';
import { CachePersistorProvider } from '../context/cache-persistor';
import { RestorePersistedCache } from './RestorePersistedCache';
import { ConfirmLeaveOnPendingPersistCache } from './ConfirmLeaveOnPendingPersistCache';
import { CacheRestorerProvider } from '../context/cache-restorer';
import { WebSocketClientProvider } from '../context/websocket-client';
import { StatsLinkProvider } from '../context/stats-link';

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
              <CacheRestorerProvider restorer={service.restorer}>
                <ConfirmLeaveOnPendingPersistCache triggerPersist={true} />
                <RestorePersistedCache fallback={restoringCacheFallback}>
                  <ResumePersistedOngoingOperations />
                  <WebSocketClientProvider wsClient={service.wsClient}>
                    {children}
                  </WebSocketClientProvider>
                </RestorePersistedCache>
              </CacheRestorerProvider>
            </CachePersistorProvider>
          </StatsLinkProvider>
        </PersistLinkProvider>
      </GetMutationUpdaterFnProvider>
    </ApolloProvider>
  );
}
