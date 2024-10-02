import { ApolloLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { Kind, OperationTypeNode } from 'graphql';
import { WaitLink } from '../link/wait';
import { StatsLink } from '../link/stats';
import { ErrorLink } from '../link/error';
import { createHttpLinks } from './http-links';
import { createWsLinks } from './ws-links';
import { WebSocketClient } from '../websocket-client';
import { passthrough } from '../link/passthrough';
import { AppContext } from '../types';

export function createLinks({
  httpUri,
  wsClient,
  appContext,
  debug,
}: {
  httpUri: string;
  wsClient?: WebSocketClient;
  appContext: Pick<AppContext, 'userId'>;
  debug?: {
    /**
     * Throttle each request by milliseconds
     */
    throttle?: number;
  };
}) {
  const { headerUserIdLink, httpLink } = createHttpLinks(httpUri, appContext);

  const { wsLink, headerWsConnectionIdLink } = createWsLinks(wsClient);

  const httpWsSplitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === Kind.OPERATION_DEFINITION &&
        definition.operation === OperationTypeNode.SUBSCRIPTION
      );
    },
    wsLink,
    ApolloLink.from([headerWsConnectionIdLink, headerUserIdLink, httpLink])
  );

  const statsLink = new StatsLink();

  const waitLink = debug?.throttle
    ? new WaitLink({
        waitTime: debug.throttle,
      })
    : passthrough();

  const errorLink = new ErrorLink();

  return {
    link: ApolloLink.from([statsLink, waitLink, errorLink, httpWsSplitLink]),
    statsLink,
    errorLink,
  };
}
