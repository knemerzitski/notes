import { CreateTypePoliciesFn } from './types';
import { Query } from './policies/Query';

export const graphQLPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
  };
};
