import {
  CacheReadyCallback,
  CreateTypePoliciesFn,
  MutationOperations,
} from '../graphql/types';
import { TaggedEvictOptionsList } from '../graphql/utils/tagged-evict';
import { SIGN_IN } from './mutations/SignIn';
import { evictOptions as Query_evictOptions, Query } from './policies/Query';
import { SignedInUser } from './policies/SignedInUser';
import { primeLocalUser } from './utils/local-user';

export const userPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    SignedInUser: SignedInUser(ctx),
  };
};

export const userMutations: MutationOperations = [SIGN_IN];

export const userEvictOptions: TaggedEvictOptionsList = [...Query_evictOptions];

export const userCacheReadyCallback: CacheReadyCallback = function (cache) {
  primeLocalUser(cache);
};
