/* eslint-disable unicorn/filename-case */
import { ReactNode } from 'react';
import { GraphQLService } from '../types';
import { QueueLinkProvider } from '../context/queue-link';
import { GateOnlineQueueLink } from './GateOnlineQueueLink';
import { PersistLinkProvider } from '../context/persist-link';
import { ResumePersistedOngoingOperations } from './ResumePersistedOngoingOperations';
import { UpdateHandlersByNameProvider } from '../context/update-handlers-by-name';
import { ApolloProvider } from '@apollo/client';

export function GraphQLServiceProvider({
  value,
  children,
}: {
  value: GraphQLService;
  children: ReactNode;
}) {
  return (
    <ApolloProvider client={value.client}>
      <UpdateHandlersByNameProvider value={value.updateHandlersByName}>
        <QueueLinkProvider value={value.links.queueLink}>
          <PersistLinkProvider value={value.links.persistLink}>
            <GateOnlineQueueLink />
            <ResumePersistedOngoingOperations />
            {children}
          </PersistLinkProvider>
        </QueueLinkProvider>
      </UpdateHandlersByNameProvider>
    </ApolloProvider>
  );
}
