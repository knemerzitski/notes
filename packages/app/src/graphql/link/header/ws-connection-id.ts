import { setContext } from '@apollo/client/link/context';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { WebSocketClient } from '../../ws/websocket-client';

export function createHeaderWsConnectionIdLink(
  wsClient: Pick<WebSocketClient, 'connectionId'>
) {
  return setContext((_request, previousContext) => {
    if (!wsClient.connectionId) return previousContext;

    return {
      ...previousContext,
      headers: {
        ...previousContext.headers,
        [CustomHeaderName.WS_CONNECTION_ID]: wsClient.connectionId,
      },
    };
  });
}
