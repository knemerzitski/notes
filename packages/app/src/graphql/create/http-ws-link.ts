import { HttpLink, split, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { isSubscriptionOperation } from '@apollo/client/utilities';
import { headerUserIdLink } from '../link/header/user-id';
import { createHeaderWsConnectionIdLink } from '../link/header/ws-connection-id';
import { passthrough } from '../link/passthrough';
import { WebSocketClient } from '../ws/websocket-client';
import { WebSocketClientSetOperationUserIdLink as WsSetOperationUserIdLink } from '../link/ws-set-operation-user-id';

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

  const wsLink = wsClient
    ? ApolloLink.from([
        new WsSetOperationUserIdLink(wsClient),
        new GraphQLWsLink(wsClient.client),
      ])
    : passthrough();

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
