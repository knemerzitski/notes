import { ApolloServerOptions, BaseContext } from '@apollo/server';
import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';

import { Logger } from '~utils/logging';

export interface GraphQLContextParams<TContext> {
  typeDefs: IExecutableSchemaDefinition<TContext>['typeDefs'];
  resolvers: IExecutableSchemaDefinition<TContext>['resolvers'];
  transform?: (schema: GraphQLSchema) => GraphQLSchema;
  logger?: Logger;
}

export interface GraphQLContext {
  schema: GraphQLSchema;
}

export function createGraphQLContext<TContext = unknown>({
  typeDefs,
  resolvers,
  transform,
}: GraphQLContextParams<TContext>): GraphQLContext {
  let schema = makeExecutableSchema({ typeDefs, resolvers });

  if (transform) {
    schema = transform(schema);
  }

  return {
    schema,
  };
}

interface ApolloDirectParams<TContext extends BaseContext> {
  apolloServerOptions: Omit<
    ApolloServerOptions<TContext>,
    'schema' | 'gateway' | 'typeDefs' | 'resolvers'
  >;
}

export interface ApolloGraphQLContextParams<TContext extends BaseContext = BaseContext>
  extends GraphQLContextParams<TContext>,
    ApolloDirectParams<TContext> {}

export interface ApolloGraphQLContext<TContext extends BaseContext = BaseContext>
  extends GraphQLContext,
    ApolloDirectParams<TContext> {}

export function createApolloGraphQLContext<TContext extends BaseContext = BaseContext>({
  typeDefs,
  resolvers,
  transform,
  logger,
  ...directParams
}: ApolloGraphQLContextParams<TContext>): ApolloGraphQLContext<TContext> {
  return {
    ...createGraphQLContext({ typeDefs, resolvers, transform, logger }),
    ...directParams,
  };
}
