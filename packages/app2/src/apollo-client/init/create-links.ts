import { split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { Kind, OperationTypeNode } from 'graphql';
import { WaitLink } from '../link/wait';
import { StatsLink } from '../link/stats';
import { ErrorLink } from '../link/error';
import { createHttpLinks } from './create-http-link';
import { createWsLinks } from './create-ws-links';
import { WebSocketClient } from '../websocket-client';
import { AppContext } from './app-context';
import { passthrough } from '../link/passthrough';

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
    headerWsConnectionIdLink.concat(headerUserIdLink).concat(httpLink)
  );

  const statsLink = new StatsLink();

  const waitLink = debug?.throttle
    ? new WaitLink({
        waitTime: debug.throttle,
      })
    : passthrough();

  const errorLink = new ErrorLink();

  return {
    link: statsLink.concat(waitLink).concat(errorLink).concat(httpWsSplitLink),
    statsLink,
    errorLink,
  };
}
