import { GraphQLSchema } from 'graphql';

import { authTransform } from './base/directives/auth';

const transforms: ((schema: GraphQLSchema) => GraphQLSchema)[] = [authTransform];

export function applyDirectives(schema: GraphQLSchema) {
  for (const transform of transforms) {
    schema = transform(schema);
  }
  return schema;
}
