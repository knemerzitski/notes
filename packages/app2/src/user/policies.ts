import {
  CacheReadyCallback,
  CreateTypePoliciesFn,
  MutationDefinitions,
} from '../graphql/types';
import { TaggedEvictOptionsList } from '../graphql/utils/tagged-evict';
import { SignIn } from './mutations/SignIn';
import { SignOut } from './mutations/SignOut';
import { UpdateSignedInUserDisplayName } from './mutations/UpdateSignedInUserDisplayName';
import { UpdateSignedInUserDisplayNamePayload } from './mutations/UpdateSignedInUserDisplayNamePayload';
import { evictOptions as Query_evictOptions, Query } from './policies/Query';
import { SignedInUser } from './policies/SignedInUser';
import { primeLocalUser } from './utils/local-user/prime';

export const userPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    SignedInUser: SignedInUser(ctx),
  };
};

export const userMutationDefinitions: MutationDefinitions = [
  SignIn,
  SignOut,
  UpdateSignedInUserDisplayName,
  UpdateSignedInUserDisplayNamePayload,
];

export const userEvictOptions: TaggedEvictOptionsList = [...Query_evictOptions];

export const userCacheReadyCallback: CacheReadyCallback = function (cache) {
  primeLocalUser(cache);
};
