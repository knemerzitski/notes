import { ApolloServer } from '@apollo/server';

import { createGraphQLContext } from '~lambda-graphql/context/graphql';

import { GraphQLResolversContext } from '../../../graphql/context';
import { applyDirectives } from '../../../graphql/directives';
import { resolvers } from '../../../graphql/resolvers.generated';
import { typeDefs } from '../../../graphql/typeDefs.generated';

export function createApolloServer() {
  const { schema } = createGraphQLContext({
    typeDefs,
    resolvers,
    transform: applyDirectives,
  });

  return new ApolloServer<GraphQLResolversContext>({
    schema,
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
    plugins: [],
  });
}

export const apolloServer = createApolloServer();
