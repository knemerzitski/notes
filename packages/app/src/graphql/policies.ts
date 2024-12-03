import { PageInfo } from './policies/PageInfo';
import { Query } from './policies/Query';
import { CreateTypePoliciesFn } from './types';

export const graphQLPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    PageInfo: PageInfo(ctx),
  };
};
