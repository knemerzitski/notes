import { setContext } from '@apollo/client/link/context';

import { CustomHeaderName } from '../../../../../api-app-shared/src/custom-headers';

import { WebSocketClient } from '../../ws/websocket-client';

export function createHeaderWsConnectionIdLink(
  wsClient: Pick<WebSocketClient, 'connectionId'>
) {
  return setContext((_request, previousContext) => {
    if (!wsClient.connectionId) return previousContext;

    return {
      ...previousContext,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      headers: {
        ...previousContext.headers,
        [CustomHeaderName.WS_CONNECTION_ID]: wsClient.connectionId,
      },
    };
  });
}
