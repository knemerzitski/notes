import './graphql/dev';

import { PossibleTypesMap } from '@apollo/client';
import { LocalStorageWrapper } from 'apollo3-cache-persist';

import { GraphQLErrorCode } from '../../api-app-shared/src/graphql/error-codes';

import { createLogger } from '../../utils/src/logging';

import generatedPossibleTypes from './__generated__/possible-types.json';
import { bootstrapCache } from './bootstrap';
import { localStorageKey, LocalStoragePrefix } from './bootstrap/utils/local-storage-key';
import { devGraphQLServiceActions } from './dev';
import { devicePreferencesPolicies } from './device-preferences/policies';
import { createGraphQLService } from './graphql/create/service';
import { graphQLPolicies } from './graphql/policies';
import {
  CacheReadyCallbacks,
  GraphQLServiceAction,
  MutationDefinitions,
  TypePoliciesList,
} from './graphql/types';
import { processCacheVersion } from './graphql/utils/process-cache-version';
import { TaggedEvictOptionsList } from './graphql/utils/tagged-evict';
import {
  noteEvictOptions,
  noteMutationDefinitions,
  notePolicies,
  notePossibleTypes,
} from './note/policies';
import {
  userEvictOptions,
  userCacheReadyCallback,
  userMutationDefinitions,
  userPolicies,
} from './user/policies';

const APOLLO_CACHE_VERSION = '4';

// DESTRUCTIVE, CACHE VERSION MISMATCH
// Any future cache breaking change must have a update/rollback to adjust cache
const PURGE_APOLLO_CACHE = !processCacheVersion(bootstrapCache, APOLLO_CACHE_VERSION);

const HTTP_URL = import.meta.env.PROD
  ? import.meta.env.VITE_GRAPHQL_HTTP_URL
  : `${location.origin}/graphql`;

const WS_URL = import.meta.env.PROD
  ? import.meta.env.VITE_GRAPHQL_WS_URL
  : `ws://${location.host}/graphql-ws`;

const TYPE_POLICIES_LIST: TypePoliciesList = [
  devicePreferencesPolicies,
  graphQLPolicies,
  userPolicies,
  notePolicies,
];

const EVICT_OPTIONS_LIST: TaggedEvictOptionsList = [
  ...userEvictOptions,
  ...noteEvictOptions,
];

const MUTATION_DEFINITIONS: MutationDefinitions = [
  ...userMutationDefinitions,
  ...noteMutationDefinitions,
];

const POSSIBLE_TYPES_LIST: PossibleTypesMap[] = [
  generatedPossibleTypes,
  notePossibleTypes,
];

const CACHE_READY_CALLBACKS: CacheReadyCallbacks = [userCacheReadyCallback];

const SERVICE_ACTIONS: GraphQLServiceAction[] = [...devGraphQLServiceActions];

export function createDefaultGraphQLServiceParams(): Parameters<
  typeof createGraphQLService
>[0] {
  return {
    httpUri: HTTP_URL,
    wsUrl: WS_URL,
    possibleTypesList: POSSIBLE_TYPES_LIST,
    typePoliciesList: TYPE_POLICIES_LIST,
    cacheReadyCallbacks: CACHE_READY_CALLBACKS,
    evictOptionsList: EVICT_OPTIONS_LIST,
    mutationDefinitions: MUTATION_DEFINITIONS,
    storageKey: localStorageKey(LocalStoragePrefix.APOLLO, 'cache'),
    storage: new LocalStorageWrapper(window.localStorage),
    linkOptions: {
      persist: {
        persistErrorCodes: [GraphQLErrorCode.UNAUTHENTICATED],
      },
      debug: import.meta.env.DEV
        ? {
            throttle: 0,
            logging: true,
          }
        : undefined,
    },
    actions: SERVICE_ACTIONS,
    purgeCache: PURGE_APOLLO_CACHE,
    logger: createLogger('GraphQLService'),
  };
}

export function createDefaultGraphQLService() {
  return createGraphQLService(createDefaultGraphQLServiceParams());
}
