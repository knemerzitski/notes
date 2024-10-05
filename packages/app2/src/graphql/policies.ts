import { CreateTypePoliciesFn } from '../graphql/types';
import { Query } from './policies/Query';

export const graphQLPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
  };
};
