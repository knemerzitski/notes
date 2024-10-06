import './dev';

import { getCurrentSignedInUserId } from '../user/utils/signed-in-user';
import possibleTypes from '../__generated__/possible-types.json';
import { userEvictOptions, userMutations, userPolicies } from '../user/policies';
import { MutationOperations, TypePoliciesList } from './types';
import { createGraphQLService } from './service';
import { graphQLPolicies } from './policies';
import { TaggedEvictOptionsList } from './utils/tagged-evict';
import { localStorageKey, LocalStoragePrefix } from '../local-storage';
import { LocalStorageWrapper } from 'apollo3-cache-persist';
import { devicePreferencesPolicies } from '../device-preferences/policies';

const HTTP_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_HTTP_URL
    : `${location.origin}/graphql`;

const WS_URL =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GRAPHQL_WS_URL
    : `ws://${location.host}/graphql-ws`;

const TYPE_POLICIES_LIST: TypePoliciesList = [
  graphQLPolicies,
  userPolicies,
  devicePreferencesPolicies,
];

const EVICT_OPTIONS_LIST: TaggedEvictOptionsList = [...userEvictOptions];

const MUTATION_OPERATIONS: MutationOperations = [...userMutations];

export function createDefaultGraphQLServiceParams(): Parameters<
  typeof createGraphQLService
>[0] {
  return {
    httpUri: HTTP_URL,
    wsUrl: WS_URL,
    possibleTypes,
    typePoliciesList: TYPE_POLICIES_LIST,
    evictOptionsList: EVICT_OPTIONS_LIST,
    mutationOperations: MUTATION_OPERATIONS,
    storageKey: localStorageKey(LocalStoragePrefix.APOLLO, 'cache'),
    storage: new LocalStorageWrapper(localStorage),
    context: {
      getUserId: getCurrentSignedInUserId,
    },
  };
}

export function createDefaultGraphQLService() {
  return createGraphQLService(createDefaultGraphQLServiceParams());
}
