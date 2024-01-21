import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import DebounceLink from 'apollo-link-debounce';
import { Kind, OperationTypeNode } from 'graphql';
import { createClient } from 'graphql-ws';

import StatsLink from './links/StatsLink';
import WaitLink from './links/WaitLink';
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

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
  })
);

const debounceLink = new DebounceLink(500);

const httpWsSplitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.SUBSCRIPTION
    );
  },
  wsLink,
  // Delay mutations
  split(({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.MUTATION
    );
  }, debounceLink).concat(httpLink) // remove delay dedupe... and replace with debounce in editor
);

export const statsLink = new StatsLink();

const waitLink = new WaitLink({
  waitTime: 500,
});

export const apolloClient = new ApolloClient({
  link: statsLink.concat(waitLink).concat(httpWsSplitLink),
  cache: new InMemoryCache({
    typePolicies,
  }),
});
