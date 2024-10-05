import { CreateTypePoliciesFn } from '../graphql/types';
import { TaggedEvictOptionsList } from '../graphql/utils/tagged-evict';
import { evictOptions as Query_evictOptions, Query } from './policies/Query';
import { SignedInUser } from './policies/SignedInUser';

export const userPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    SignedInUser: SignedInUser(ctx),
  };
};

export const userEvictOptions: TaggedEvictOptionsList = [...Query_evictOptions];
