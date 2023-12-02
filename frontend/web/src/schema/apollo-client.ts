import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { Kind, OperationTypeNode } from 'graphql';
import { createClient } from 'graphql-ws';

import { resolvers } from './resolvers';
import { sessionDocumentTransform } from './session/directives/session';
import typePolicies from './typePolicies';

const httpLink = new HttpLink({
  // TODO add types for vite env vars
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //uri: import.meta.env.VITE_GRAPHQL_HTTP_URL,
});

const wsLink = new GraphQLWsLink(
  createClient({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    url: import.meta.env.VITE_GRAPHQL_WS_URL,
    //url: 'ws://localhost/graphql'
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.SUBSCRIPTION
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies,
  }),
  documentTransform: sessionDocumentTransform,
  resolvers,
});
