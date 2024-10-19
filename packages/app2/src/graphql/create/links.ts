import { ApolloLink, HttpLink, InMemoryCache, split } from '@apollo/client';
import { WaitLink } from '../link/wait';
import { StatsLink } from '../link/stats';
import { ErrorLink } from '../link/error';
import { WebSocketClient } from '../ws/websocket-client';
import { passthrough } from '../link/passthrough';
import { AppContext } from '../types';
import { RetryLink } from '@apollo/client/link/retry';
import QueueLink from 'apollo-link-queue';
import SerializingLink from 'apollo-link-serialize';
import { PersistLink } from '../link/persist';
import apolloLogger from 'apollo-link-logger';
import { CurrentUserLink } from '../link/current-user';
import { headerUserIdLink } from '../link/header/user-id';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createHeaderWsConnectionIdLink } from '../link/header/ws-connection-id';
import { isSubscriptionOperation } from '@apollo/client/utilities';

export function createHttpWsLink({
  httpUri,
  wsClient,
}: {
  httpUri: string;
  wsClient?: WebSocketClient;
}) {
  const httpLink = new HttpLink({
    uri: httpUri,
  });

  const wsLink = wsClient ? new GraphQLWsLink(wsClient.client) : passthrough();

  const headerWsConnectionIdLink = wsClient
    ? createHeaderWsConnectionIdLink(wsClient)
    : passthrough();

  const httpWsSplitLink = split(
    ({ query }) => isSubscriptionOperation(query),
    wsLink,
    ApolloLink.from([headerWsConnectionIdLink, headerUserIdLink, httpLink])
  );

  return httpWsSplitLink;
}

export function createLinks({
  appContext,
  wsClient,
  cache,
  options,
}: {
  appContext: Pick<AppContext, 'userId'>;
  wsClient?: WebSocketClient;
  cache: InMemoryCache;
  options?: {
    persist?: ConstructorParameters<typeof PersistLink>[1];
  debug?: {
    /**
     * Throttle each request by milliseconds
     */
    throttle?: number;
    /**
     * Include a logger link
     * @default false
     */
    logging?: boolean;
    };
  };
}) {
  const currentUserLink = new CurrentUserLink(appContext, wsClient);
  const loggerLink = debug?.logging ? apolloLogger : passthrough();
  const statsLink = new StatsLink();
  const persistLink = new PersistLink(cache, options?.persist);
  const gateLink = new GateLink();
  const serializingLink = new SerializingLink();
  const retryLink = new RetryLink();

  const waitLink = debug?.throttle
    ? new WaitLink({
        waitTime: debug.throttle,
      })
    : passthrough();

  return {
    link: ApolloLink.from([
      currentUserLink,
      loggerLink,
      errorLink,
      statsLink,
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
