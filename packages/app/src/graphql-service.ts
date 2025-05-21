import './graphql/dev';

import { PossibleTypesMap } from '@apollo/client';

import { GraphQLErrorCode } from '../../api-app-shared/src/graphql/error-codes';

import { createLogger } from '../../utils/src/logging';

import generatedPossibleTypes from './__generated__/possible-types.json';
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
import { TaggedEvictOptionsList } from './graphql/utils/tagged-evict';
import { noteContext } from './note/context';
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

export const DB_NAME = 'app';
export const STORE_NAME = 'v1';

const HTTP_URL = import.meta.env.PROD
  ? import.meta.env.VITE_GRAPHQL_HTTP_URL
  : `${location.origin}/graphql`;

const WS_URL = import.meta.env.PROD
  ? import.meta.env.VITE_GRAPHQL_WS_URL
  : `ws://${location.host}/graphql-ws`;

const DEFAULT_CONTEXT_INITIALIZERS = {
  note: noteContext,
};

export type DefaultContextInitializers = typeof DEFAULT_CONTEXT_INITIALIZERS;

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
  const override = window.appEnvironment?.overrideDefaultGraphQLServiceParams;

  return {
    httpUri: HTTP_URL,
    wsUrl: WS_URL,
    possibleTypesList: POSSIBLE_TYPES_LIST,
    defaultContextInitializers: DEFAULT_CONTEXT_INITIALIZERS,
    typePoliciesList: TYPE_POLICIES_LIST,
    cacheReadyCallbacks: CACHE_READY_CALLBACKS,
    evictOptionsList: EVICT_OPTIONS_LIST,
    mutationDefinitions: MUTATION_DEFINITIONS,
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
    logger: createLogger('graphql'),
    ...(!import.meta.env.PROD && override),
    storage: {
      preferredType: 'indexedDB',
      dbName: DB_NAME,
      storeName: STORE_NAME,
      keys: {
        apolloCache: 'apollo-cache',
        collabManager: 'collab-manager',
      },
      debounce: {
        wait: 1500,
        maxWait: 10000,
      },
      ...(!import.meta.env.PROD && override?.storage),
    },
  };
}

export function createDefaultGraphQLService() {
  return createGraphQLService(createDefaultGraphQLServiceParams());
}
