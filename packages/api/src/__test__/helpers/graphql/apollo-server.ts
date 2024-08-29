import { ApolloServer } from '@apollo/server';

import { createGraphQLContext } from '~lambda-graphql/context/graphql';

import { GraphQLResolversContext } from '../../../graphql/types';
import { applyDirectives } from '../../../graphql/directives';
import { resolvers } from '../../../graphql/domains/resolvers.generated';
import { typeDefs } from '../../../graphql/domains/typeDefs.generated';
import { formatError } from '../../../graphql/errors';

export function createApolloServer() {
  const { schema } = createGraphQLContext({
    typeDefs,
    resolvers,
    transform: applyDirectives,
  });

  return new ApolloServer<GraphQLResolversContext>({
    schema,
    nodeEnv: 'test',
    plugins: [],
    formatError,
  });
}

export const apolloServer = createApolloServer();
