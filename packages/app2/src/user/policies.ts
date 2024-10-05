import { CreateTypePoliciesFn, TaggedEvictOptionsList } from '../graphql/types';
import { evictOptions as Query_evictOptions, Query } from './policies/query';
import { SignedInUser } from './policies/signed-in-user';

export const userPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    SignedInUser: SignedInUser(ctx),
  };
};

export const userEvictOptions: TaggedEvictOptionsList = [...Query_evictOptions];
