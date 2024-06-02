import { GraphQLSchema } from 'graphql';

import { authTransform } from './base/directives/auth';
import { lengthTransform } from './base/directives/length';

const transforms: ((schema: GraphQLSchema) => GraphQLSchema)[] = [
  authTransform,
  lengthTransform,
];

export function applyDirectives(schema: GraphQLSchema) {
  for (const transform of transforms) {
    schema = transform(schema);
  }
  return schema;
}
