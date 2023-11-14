import { GRAPHQL_TRANSPORT_WS_PROTOCOL } from 'graphql-ws';

import { EventHandler } from '../webSocketSubscriptionHandler';

export const connect: EventHandler = async ({ context, event }) => {
  context.logger.info('event:CONNECT', { connectionId: event.requestContext.connectionId });
  // TODO trigger event onConnect?
  return {
    statusCode: 200,
    headers: {
      'Sec-Websocket-Protocol': GRAPHQL_TRANSPORT_WS_PROTOCOL,
    },
  };
};
