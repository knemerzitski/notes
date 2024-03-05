import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { Kind, OperationTypeNode } from 'graphql';
import { createClient, MessageType } from 'graphql-ws';

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

const httpLink = new HttpLink({
  uri: HTTP_URL,
});

// Send connection id with each http request to prevent receiving subscription updates from yourself
let wsConnectionId: string | null = null;
const addWsConnectionIdLink = setContext((_request, previousContext) => {
  if (!wsConnectionId) return previousContext;
  return {
    headers: {
      // TODO header name part of shared module
      'X-Ws-Connection-Id': wsConnectionId,
    },
  };
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    on: {
      message(message) {
        if (message.type === MessageType.ConnectionAck) {
          const payload = message.payload;
          if (payload) {
            // TODO payload connectionId key part of shared module
            if ('connectionId' in payload) {
              const connectionId = payload.connectionId;
              if (typeof connectionId === 'string' && connectionId.length > 0) {
                wsConnectionId = connectionId;
              }
            }
          }
        }
      },
      closed() {
        wsConnectionId = null;
      },
    },
  })
);

// const debounceLink = new DebounceLink(500);

// const httpWsSplitLink = split(
//   ({ query }) => {
//     const definition = getMainDefinition(query);
//     return (
//       definition.kind === Kind.OPERATION_DEFINITION &&
//       definition.operation === OperationTypeNode.SUBSCRIPTION
//     );
//   },
//   wsLink,
//   // Delay mutations
//   split(({ query }) => {
//     const definition = getMainDefinition(query);
//     return (
//       definition.kind === Kind.OPERATION_DEFINITION &&
//       definition.operation === OperationTypeNode.MUTATION
//     );
//   }, debounceLink)
//     .concat(addWsConnectionIdLink)
//     .concat(httpLink)
// );
const httpWsSplitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.SUBSCRIPTION
    );
  },
  wsLink,
  addWsConnectionIdLink.concat(httpLink)
);

export const statsLink = new StatsLink();

const waitLink = new WaitLink({
  waitTime: 200,
});

export const apolloClient = new ApolloClient({
  link: statsLink.concat(waitLink).concat(httpWsSplitLink),
  cache: new InMemoryCache({
    typePolicies,
  }),
});
