import {
  CacheReadyCallback,
  CreateTypePoliciesFn,
  MutationDefinitions,
} from '../graphql/types';
import { TaggedEvictOptionsList } from '../graphql/utils/tagged-evict';

import { primeLocalUser } from './models/local-user/prime';
import { SignIn } from './mutations/SignIn';
import { SignOut } from './mutations/SignOut';
import { UpdateSignedInUserDisplayName } from './mutations/UpdateSignedInUserDisplayName';
import { UpdateSignedInUserDisplayNamePayload } from './mutations/UpdateSignedInUserDisplayNamePayload';
import { LocalUser } from './policies/LocalUser';
import { evictOptions as Query_evictOptions, Query } from './policies/Query';
import { User } from './policies/User';
import { UserOperation } from './policies/UserOperation';

export const userPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    User: User(ctx),
    LocalUser: LocalUser(ctx),
    UserOperation: UserOperation(ctx),
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
