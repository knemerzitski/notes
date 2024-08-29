import { GraphQLSchema } from 'graphql';

import { authTransform } from './domains/base/directives/auth';
import { lengthTransform } from './domains/base/directives/length';

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
