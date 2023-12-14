import { GraphQLSchema } from 'graphql';

import { authTransform, subscriptionAuthTransform } from './base/directives/auth';

const transforms: ((schema: GraphQLSchema) => GraphQLSchema)[] = [authTransform];

const subscriptionTransforms: ((schema: GraphQLSchema) => GraphQLSchema)[] = [
  subscriptionAuthTransform,
];

export function applyDirectives(schema: GraphQLSchema) {
  for (const transform of transforms) {
    schema = transform(schema);
  }
  return schema;
}

export function applySubscriptionDirectives(schema: GraphQLSchema) {
  for (const transform of subscriptionTransforms) {
    schema = transform(schema);
  }
  return schema;
}
