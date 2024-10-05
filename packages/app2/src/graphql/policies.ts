import { CreateTypePoliciesFn } from '../graphql/types';
import { Query } from './policies/query';

export const graphQLPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
  };
};
