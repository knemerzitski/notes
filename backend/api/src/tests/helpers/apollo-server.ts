import { ApolloServer } from '@apollo/server';

import { GraphQLResolversContext } from '../../graphql/context';
import { resolvers } from '../../graphql/resolvers.generated';
import { typeDefs } from '../../graphql/typeDefs.generated';

export const apolloServer = new ApolloServer<GraphQLResolversContext>({
  typeDefs,
  resolvers,
});
