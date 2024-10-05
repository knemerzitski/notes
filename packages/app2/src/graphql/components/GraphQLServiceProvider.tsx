import { ReactNode } from 'react';
import { GraphQLService } from '../types';
import { QueueLinkProvider } from '../context/queue-link';
import { GateOnlineQueueLink } from './GateOnlineQueueLink';

export function GraphQLServiceProvider({
  value,
  children,
}: {
  value: GraphQLService;
  children: ReactNode;
}) {
  return (
    // TODO add more providers
    <QueueLinkProvider value={value.links.queueLink}>
      <GateOnlineQueueLink />
      {children}
    </QueueLinkProvider>
  );
}
