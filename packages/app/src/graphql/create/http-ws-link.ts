import { HttpLink, split, ApolloLink, HttpOptions } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { isSubscriptionOperation } from '@apollo/client/utilities';

import { createHeaderWsConnectionIdLink } from '../link/header/ws-connection-id';
import { passthrough } from '../link/passthrough';
import { WebSocketClient } from '../ws/websocket-client';

export function createHttpWsLink({
  httpOptions,
  wsClient,
}: {
  httpOptions: HttpOptions;
  wsClient?: WebSocketClient;
}) {
  const httpLink = new HttpLink(httpOptions);

  const wsLink = wsClient
    ? ApolloLink.from([new GraphQLWsLink(wsClient.client)])
    : passthrough();

  const headerWsConnectionIdLink = wsClient
    ? createHeaderWsConnectionIdLink(wsClient)
    : passthrough();

  const httpWsSplitLink = split(
    ({ query }) => isSubscriptionOperation(query),
    wsLink,
    ApolloLink.from([headerWsConnectionIdLink, httpLink])
  );

  return httpWsSplitLink;
}
