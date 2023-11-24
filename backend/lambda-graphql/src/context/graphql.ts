import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';

import { Logger } from '~common/logger';

export interface GraphQLContextParams<TContext> {
  typeDefs: IExecutableSchemaDefinition<TContext>['typeDefs'];
  resolvers: IExecutableSchemaDefinition<TContext>['resolvers'];
  transform?: (schema: GraphQLSchema) => GraphQLSchema;
  logger: Logger;
}

export interface GraphQLContext {
  schema: GraphQLSchema;
}

export function createGraphQlContext<TContext = unknown>({
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
