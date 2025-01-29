import { WebSocketHandlerParams } from '~lambda-graphql/websocket-handler';

import { WebSocketHandlerGraphQLResolversContext } from '../graphql/types';

export const onConnectionInit: WebSocketHandlerParams<WebSocketHandlerGraphQLResolversContext>['onConnectionInit'] =
  async function () {
    // Do nothing for now
  };
