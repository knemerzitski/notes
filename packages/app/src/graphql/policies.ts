import { CreateTypePoliciesFn } from './types';
import { Query } from './policies/Query';
import { PageInfo } from './policies/PageInfo';

export const graphQLPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    PageInfo: PageInfo(ctx),
  };
};
