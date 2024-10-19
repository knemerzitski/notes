import './graphql/dev';

import possibleTypes from './__generated__/possible-types.json';
import {
  userEvictOptions,
  userCacheReadyCallback,
  userMutationDefinitions,
  userPolicies,
} from './user/policies';
import {
  CacheReadyCallbacks,
  MutationDefinitions,
  TypePoliciesList,
} from './graphql/types';
import { createGraphQLService } from './graphql/create/service';
import { graphQLPolicies } from './graphql/policies';
import { TaggedEvictOptionsList } from './graphql/utils/tagged-evict';
import { localStorageKey, LocalStoragePrefix } from './local-storage';
import { LocalStorageWrapper } from 'apollo3-cache-persist';
import { devicePreferencesPolicies } from './device-preferences/policies';
import { getCurrentUserId } from './user/utils/signed-in-user/get-current';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

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

const MUTATION_DEFINITIONS: MutationDefinitions = [...userMutationDefinitions];

const CACHE_READY_CALLBACKS: CacheReadyCallbacks = [userCacheReadyCallback];

export function createDefaultGraphQLServiceParams(): Parameters<
  typeof createGraphQLService
>[0] {
  return {
    httpUri: HTTP_URL,
    wsUrl: WS_URL,
    possibleTypes,
    typePoliciesList: TYPE_POLICIES_LIST,
    cacheReadyCallbacks: CACHE_READY_CALLBACKS,
    evictOptionsList: EVICT_OPTIONS_LIST,
    mutationDefinitions: MUTATION_DEFINITIONS,
    storageKey: localStorageKey(LocalStoragePrefix.APOLLO, 'cache'),
    storage: new LocalStorageWrapper(window.localStorage),
    context: {
      getUserId: getCurrentUserId,
    },
    linkOptions: {
      persist: {
        persistErrorCodes: [GraphQLErrorCode.UNAUTHENTICATED],
      },
      debug:
        import.meta.env.MODE !== 'production'
          ? {
              throttle: 0,
              logging: true,
            }
          : undefined,
    },
  };
}

export function createDefaultGraphQLService() {
  return createGraphQLService(createDefaultGraphQLServiceParams());
}
