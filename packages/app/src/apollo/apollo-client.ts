import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { Kind, OperationTypeNode } from 'graphql';
import { createClient, MessageType, ConnectionInitMessage } from 'graphql-ws';

import { CustomHeaderName } from '~api-app-shared/custom-headers';

import { readSessionContext } from '../session/state/persistence';

import ErrorLink from './links/error-link';
import StatsLink from './links/stats-link';
import WaitLink from './links/wait-link';
import typePolicies from './policies';


const HTTP_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_HTTP_URL
    : `${location.origin}/graphql`;

const WS_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_WS_URL
    : `ws://${location.host}/graphql-ws`;

export class ExtendendApolloClient {
  readonly client: ApolloClient<NormalizedCacheObject>;

  readonly statsLink: StatsLink;
  readonly errorLink: ErrorLink;

  restartSubscriptionClient: () => void;
  private restartRequested;

  constructor() {
    const httpLink = new HttpLink({
      uri: HTTP_URL,
    });

    const authLink = setContext((_request, previousContext) => {
      const sessions = readSessionContext();
      const currentUserId = sessions?.currentSession.id ?? '';
      if (!currentUserId) return previousContext;
      return {
        ...previousContext,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: {
          ...previousContext.headers,
          [CustomHeaderName.UserId]: currentUserId,
        },
      };
    });

    // Send connection id with each http request to prevent receiving subscription updates from self
    let wsConnectionId: string | null = null;
    const addWsConnectionIdLink = setContext((_request, previousContext) => {
      if (!wsConnectionId) return previousContext;
      return {
        ...previousContext,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: {
          ...previousContext.headers,
          [CustomHeaderName.WsConnectionId]: wsConnectionId,
        },
      };
    });

    this.restartRequested = false;
    this.restartSubscriptionClient = () => {
      wsClient.terminate();
      this.restartRequested = true;
    };

    const wsClient = createClient({
      url: WS_URL,
      lazy: false,
      retryAttempts: Infinity,
      connectionParams() {
        // Send authentication in connection init
        const sessions = readSessionContext();
        const currentUserId = sessions?.currentSession.id ?? '';

        const payload: ConnectionInitMessage['payload'] = {
          headers: {
            [CustomHeaderName.UserId]: currentUserId,
          },
        };

        return payload;
      },
      on: {
        connected: (socket) => {
          if (socket instanceof WebSocket) {
            this.restartSubscriptionClient = () => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.close(4499, 'Terminated');
              }
            };

            if (this.restartRequested) {
              this.restartRequested = false;
              this.restartSubscriptionClient();
            }
          }
        },
        message: (message) => {
          if (message.type === MessageType.ConnectionAck) {
            const payload = message.payload;
            if (payload) {
              if ('connectionId' in payload) {
                const connectionId = payload.connectionId;
                if (typeof connectionId === 'string' && connectionId.length > 0) {
                  wsConnectionId = connectionId;
                }
              }
            }
          }
        },
        closed: () => {
          wsConnectionId = null;
        },
      },
    });

    const wsLink = new GraphQLWsLink(wsClient);

    const httpWsSplitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === Kind.OPERATION_DEFINITION &&
          definition.operation === OperationTypeNode.SUBSCRIPTION
        );
      },
      wsLink,
      addWsConnectionIdLink.concat(authLink).concat(httpLink)
    );

    const statsLink = new StatsLink();
    const errorLink = new ErrorLink();

    const waitLink = new WaitLink({
      waitTime: 0,
    });

    const apolloClient = new ApolloClient({
      link: statsLink.concat(waitLink).concat(errorLink).concat(httpWsSplitLink),
      cache: new InMemoryCache({
        typePolicies,
      }),
    });

    this.client = apolloClient;

    this.statsLink = statsLink;
    this.errorLink = errorLink;
  }
}

export const apolloClient = new ExtendendApolloClient();
