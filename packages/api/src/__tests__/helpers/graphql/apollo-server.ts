import { ApolloServer } from '@apollo/server';

import { createGraphQLContext } from '~lambda-graphql/context/graphql';

import { applyDirectives } from '../../../graphql/directives';
import { resolvers } from '../../../graphql/domains/resolvers.generated';
import { typeDefs } from '../../../graphql/domains/typeDefs.generated';
import { formatError } from '../../../graphql/errors';
import { GraphQLResolversContext } from '../../../graphql/types';

export function createApolloServer() {
  const { schema } = createGraphQLContext({
    typeDefs,
    resolvers,
    transform: applyDirectives,
  });

  return new ApolloServer<GraphQLResolversContext>({
    schema,
    nodeEnv: 'development',
    plugins: [],
    formatError,
  });
}

export const apolloServer = createApolloServer();
