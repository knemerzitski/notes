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

export function GraphQLServiceProvider({
  value,
  children,
  restoringCacheFallback,
}: {
  value: GraphQLService;
  children: ReactNode;
  restoringCacheFallback?: ReactNode;
}) {
  return (
    <ApolloProvider client={value.client}>
      <UpdateHandlersByNameProvider value={value.updateHandlersByName}>
        <QueueLinkProvider value={value.links.queueLink}>
          <PersistLinkProvider value={value.links.persistLink}>
            <CachePersistorProvider value={value.persistor}>
              <GateOnlineQueueLink />
              <ConfirmLeaveOnPendingPersistCache triggerPersist={true} />
              <RestorePersistedCache fallback={restoringCacheFallback}>
                <ResumePersistedOngoingOperations />
                {children}
              </RestorePersistedCache>
            </CachePersistorProvider>
          </PersistLinkProvider>
        </QueueLinkProvider>
      </UpdateHandlersByNameProvider>
    </ApolloProvider>
  );
}
