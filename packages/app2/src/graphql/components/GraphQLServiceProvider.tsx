/* eslint-disable unicorn/filename-case */
import { ReactNode } from 'react';
import { GraphQLService } from '../types';
import { QueueLinkProvider } from '../context/queue-link';
import { GateOnlineQueueLink } from './GateOnlineQueueLink';
import { PersistLinkProvider } from '../context/persist-link';
import { ResumePersistedOngoingOperations } from './ResumePersistedOngoingOperations';
import { UpdateHandlersByNameProvider } from '../context/update-handlers-by-name';
import { ApolloProvider } from '@apollo/client';
import { CachePersistorProvider } from '../context/cache-persistor';
import { RestorePersistedCache } from './RestorePersistedCache';
import { ConfirmLeaveOnPendingPersistCache } from './ConfirmLeaveOnPendingPersistCache';
import { CacheRestorerProvider } from '../context/cache-restorer';
import { WebSocketClientProvider } from '../context/websocket-client';
import { ErrorLinkProvider } from '../context/error-link';

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
      <UpdateHandlersByNameProvider handlers={service.updateHandlersByName}>
        <QueueLinkProvider queueLink={service.links.queueLink}>
          <PersistLinkProvider persistLink={service.links.persistLink}>
            <ErrorLinkProvider errorLink={service.links.errorLink}>
              <CachePersistorProvider persistor={service.persistor}>
                <CacheRestorerProvider restorer={service.restorer}>
                  <GateOnlineQueueLink />
                  <ConfirmLeaveOnPendingPersistCache triggerPersist={true} />
                  <RestorePersistedCache fallback={restoringCacheFallback}>
                    <ResumePersistedOngoingOperations />
                    <WebSocketClientProvider wsClient={service.wsClient}>
                      {children}
                    </WebSocketClientProvider>
                  </RestorePersistedCache>
                </CacheRestorerProvider>
              </CachePersistorProvider>
            </ErrorLinkProvider>
          </PersistLinkProvider>
        </QueueLinkProvider>
      </UpdateHandlersByNameProvider>
    </ApolloProvider>
  );
}
