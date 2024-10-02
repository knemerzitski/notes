import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { WebSocketClient } from '../websocket-client';
import { setContext } from '@apollo/client/link/context';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { passthrough } from '../link/passthrough';

export function createWsLinks(wsClient: WebSocketClient | undefined) {
  if (!wsClient) {
    return {
      headerWsConnectionIdLink: passthrough(),
      wsLink: passthrough(),
    };
  }

  return {
    headerWsConnectionIdLink: setContext((_request, previousContext) => {
      if (!wsClient.connectionId) return previousContext;

      return {
        ...previousContext,
        headers: {
          ...previousContext.headers,
          [CustomHeaderName.WS_CONNECTION_ID]: wsClient.connectionId,
        },
      };
    }),
    wsLink: new GraphQLWsLink(wsClient.client),
  };
}
