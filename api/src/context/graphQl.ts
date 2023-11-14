import { IExecutableSchemaDefinition, makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';

import { Logger } from '../utils/logger';

export interface GraphQlContextConfig<TContext = unknown> {
  typeDefs: IExecutableSchemaDefinition<TContext>['typeDefs'];
  resolvers: IExecutableSchemaDefinition<TContext>['resolvers'];
  logger: Logger;
}

export interface GraphQlContext {
  schema: GraphQLSchema;
}

export function buildGraphQlContext<TContext = unknown>({
  typeDefs,
  resolvers,
}: GraphQlContextConfig<TContext>): GraphQlContext {
  return {
    schema: makeExecutableSchema({ typeDefs, resolvers }),
  };
}
