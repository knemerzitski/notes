import { ApolloServer } from '@apollo/server';

import { GraphQLResolversContext } from '../../../graphql/context';
import { resolvers } from '../../../graphql/resolvers.generated';
import { typeDefs } from '../../../graphql/typeDefs.generated';

export function createApolloServer() {
  return new ApolloServer<GraphQLResolversContext>({
    typeDefs,
    resolvers,
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
    plugins: [],
  });
}

export const apolloServer = createApolloServer();
