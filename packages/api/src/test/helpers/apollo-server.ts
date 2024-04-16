import { ApolloServer } from '@apollo/server';

import { GraphQLResolversContext } from '../../graphql/context';
import { resolvers } from '../../graphql/resolvers.generated';
import { typeDefs } from '../../graphql/typeDefs.generated';
import { RemoveResolverOnlyErrors } from '../../graphql/plugins/remove-resolver-only-errors';
import { GroupDuplicateErrors } from '../../graphql/plugins/group-duplicate-errors';

export const apolloServer = new ApolloServer<GraphQLResolversContext>({
  typeDefs,
  resolvers,
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  plugins: [new RemoveResolverOnlyErrors(), new GroupDuplicateErrors()],
});
