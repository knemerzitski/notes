import { ApolloLink, InMemoryCache, split } from '@apollo/client';
import { WaitLink } from '../link/wait';
import { StatsLink } from '../link/stats';
import { ErrorLink } from '../link/error';
import { createHttpLinks } from './http-links';
import { createWsLinks } from './ws-links';
import { WebSocketClient } from '../ws/websocket-client';
import { passthrough } from '../link/passthrough';
import { AppContext } from '../types';
import { RetryLink } from '@apollo/client/link/retry';
import QueueLink from 'apollo-link-queue';
import SerializingLink from 'apollo-link-serialize';
import { isSubscription } from '../utils/operation-type';
import { PersistLink } from '../link/persist';

export function createHttpWsLink({
  httpUri,
  wsClient,
  appContext,
}: {
  httpUri: string;
  wsClient?: WebSocketClient;
  appContext: Pick<AppContext, 'userId'>;
}) {
  const { headerUserIdLink, httpLink } = createHttpLinks(httpUri, appContext);

  const { wsLink, headerWsConnectionIdLink } = createWsLinks(wsClient);

  const httpWsSplitLink = split(
    ({ query }) => isSubscription(query),
    wsLink,
    ApolloLink.from([headerWsConnectionIdLink, headerUserIdLink, httpLink])
  );

  return httpWsSplitLink;
}

export function createLinks({
  cache,
  debug,
}: {
  cache: InMemoryCache;
  debug?: {
    /**
     * Throttle each request by milliseconds
     */
    throttle?: number;
  };
}) {
  // ErrorLink is utilized in a React component
  const statsLink = new StatsLink();

  // ErrorLink is utilized in a React component
  const errorLink = new ErrorLink();

  const persistLink = new PersistLink(cache);

  // QueueLink open/close is called from a React component
  const queueLink = new QueueLink();
  const serializingLink = new SerializingLink();
  const retryLink = new RetryLink();

  const waitLink = debug?.throttle
    ? new WaitLink({
        waitTime: debug.throttle,
      })
    : passthrough();

  return {
    link: ApolloLink.from([
      statsLink,
      errorLink,
      persistLink,
      queueLink,
      serializingLink,
      waitLink,
      retryLink,
    ]),
    pick: {
      statsLink,
      errorLink,
      persistLink,
      queueLink,
      serializingLink,
      waitLink,
      retryLink,
    },
  };
}
