import {
  ApolloClient,
  ApolloLink,
  DefaultContext,
  HttpOptions,
  InMemoryCache,
  PossibleTypesMap,
} from '@apollo/client';
import { isQueryOperation } from '@apollo/client/utilities';

import { createStore } from 'idb-keyval';
import mapObject from 'map-obj';

import { Logger } from '../../../../utils/src/logging';

import { DefaultContextInitializers } from '../../graphql-service';
import { ApolloCachePersist } from '../../persistence/apollo-cache/persist';
import { ApolloCacheRestore } from '../../persistence/apollo-cache/restore';
import { Store } from '../../persistence/types';
import { DebounceSetManyStoreBuffer } from '../../persistence/utils/debounce-set-many-store-buffer';
import { DeferredRestorer } from '../../persistence/utils/deferred-restorer';
import { GetManyStoreBatcher } from '../../persistence/utils/get-many-batcher';
import { IndexedDBStore } from '../../persistence/utils/idb-store';
import { LocalStorageStore } from '../../persistence/utils/local-storage-store';
import {
  CacheReadyCallbacks,
  GraphQLServiceAction,
  MutationDefinitions,
  TypePoliciesList,
  InitializeModuleContextOptions,
  ModuleContext,
} from '../types';

import { CacheEvictionTracker } from '../utils/eviction-tracker';
import { createOnlineGate } from '../utils/online-gate';
import { TaggedEvict, TaggedEvictOptionsList } from '../utils/tagged-evict';
import { createUsersGates, initUsersGates } from '../utils/user-gate';
import { WebSocketClient } from '../ws/websocket-client';

import { createRunCacheReadyCallbacks } from './cache-ready-callbacks';
import { createErrorLink } from './error-link';
import { createHttpWsLink } from './http-ws-link';
import { createLinks } from './links';
import { createMutationUpdaterFunctionMap } from './mutation-updater-map';
import { addTypePolicies, createTypePolicies } from './type-policies';

export function createGraphQLService({
  httpUri,
  wsUrl,
  terminatingLink,
  httpOptions,
  possibleTypesList,
  defaultContextInitializers,
  typePoliciesList,
  cacheReadyCallbacks,
  evictOptionsList,
  mutationDefinitions,
  storage,
  skipRestoreCache = false,
  linkOptions,
  actions,
  logger,
}: {
  httpUri: string;
  wsUrl: string | undefined;
  /**
   * Specify terminating link to use
   */
  terminatingLink?: ApolloLink;
  /**
   * Specify terminating link to use only for HTTP requests.
   * Subscriptions use default link.
   *
   * This option has no effect when {@link terminatingLink} is defined
   */
  httpOptions?: Omit<HttpOptions, 'uri'>;
  possibleTypesList?: PossibleTypesMap[];
  defaultContextInitializers: DefaultContextInitializers;
  typePoliciesList: TypePoliciesList;
  cacheReadyCallbacks: CacheReadyCallbacks;
  evictOptionsList: TaggedEvictOptionsList;
  mutationDefinitions: MutationDefinitions;
  /**
   * Call persistor.restore() immediately.
   * Restore status can be checked in `restorer`.
   * @default false
   */
  skipRestoreCache?: boolean;
  /**
   * Deletes all data from storage
   * @default false
   */
  storage: {
    custom?: Store;
    preferredType?: 'indexedDB' | 'localStorage';
    dbName: string;
    storeName: string;
    keyPrefix?: string;
    keys: {
      apolloCache: string;
      collabManager: string;
    };
    debounce: Pick<
      ConstructorParameters<typeof DebounceSetManyStoreBuffer>[1],
      'wait' | 'maxWait'
    >;
  };
  linkOptions?: Parameters<typeof createLinks>[0]['options'];
  actions?: GraphQLServiceAction[];
  logger?: Logger;
}) {
  logger?.debug('create');

  const mutationUpdaterFnMap = createMutationUpdaterFunctionMap(mutationDefinitions);

  const cache = new InMemoryCache({
    gcExplicitWrites: true,
  });

  possibleTypesList?.forEach((possibleTypes) => {
    cache.policies.addPossibleTypes(possibleTypes);
  });

  const storageKeyPrefix = storage.keyPrefix ?? '';
  const store =
    storage.custom ??
    (typeof window.indexedDB !== 'undefined' &&
    (storage.preferredType === 'indexedDB' || storage.preferredType === undefined)
      ? new IndexedDBStore(createStore(storage.dbName, storage.storeName))
      : new LocalStorageStore(window.localStorage, {
          keyPrefix: `${storage.dbName}:${storage.storeName}:`,
        }));

  const debounceStoreBuffer = new DebounceSetManyStoreBuffer(store, storage.debounce);
  const getManyStoreBatcher = new GetManyStoreBatcher(store);

  const _apolloCachePersist = new ApolloCachePersist({
    key: `${storageKeyPrefix}${storage.keys.apolloCache}`,
    cache,
    storeBuffer: debounceStoreBuffer,
  });
  const apolloCacheRestore = new ApolloCacheRestore({
    key: `${storageKeyPrefix}${storage.keys.apolloCache}`,
    cache,
    store: getManyStoreBatcher,
  });

  const deferredRestorer = new DeferredRestorer(apolloCacheRestore);
  if (!skipRestoreCache) {
    void deferredRestorer.restore();
  }

  createRunCacheReadyCallbacks({
    callbacks: cacheReadyCallbacks,
    restorer: deferredRestorer,
    cache,
  });

  const typePolicies = createTypePolicies(typePoliciesList, {
    logger,
  });

  addTypePolicies(typePolicies, cache);

  const taggedEvict = new TaggedEvict(evictOptionsList);

  const wsClient = wsUrl
    ? new WebSocketClient({
        url: wsUrl,
      })
    : undefined;

  const links = createLinks({
    cache,
    options: linkOptions,
  });

  const disposeOnlineGate = createOnlineGate(links.pick.gateLink);
  const getUserGate = createUsersGates(links.pick.gateLink);
  void deferredRestorer.restored().then(() => {
    initUsersGates(getUserGate, cache);
  });

  // When app starts, block all queries until mutations have been procesed.
  // Reduces data inconsistency between server and client
  const queryGate = links.pick.gateLink.create((operation) => {
    return isQueryOperation(operation.query);
  });
  queryGate.close();
  const offQueryGateOpen = links.pick.statsLink.subscribeToOngoingDocumentsCountByType(
    ({ mutation }) => {
      const hasNoMutations = mutation == 0;
      if (hasNoMutations) {
        // No longer need to listen to stats events
        setTimeout(() => {
          offQueryGateOpen();
        });
        queryGate.dispose();
      }
    }
  );

  const initializeContextOptions: InitializeModuleContextOptions = {
    logger,
    cache,
    evictionTracker: new CacheEvictionTracker(cache),
    store: {
      get: getManyStoreBatcher.get.bind(getManyStoreBatcher),
    },
    storeBuffer: debounceStoreBuffer,
    collabManager: {
      storeKeyPrefix: `${storageKeyPrefix}${storage.keys.collabManager}:`,
    },
  };

  const moduleContext: ModuleContext = mapObject(
    defaultContextInitializers,
    (key, init) => [key, init(initializeContextOptions)]
  );

  const defaultContext: DefaultContext = {
    getUserGate,
    taggedEvict,
    module: moduleContext,
  };

  const apolloClient = new ApolloClient({
    cache,
    assumeImmutableResults: import.meta.env.PROD,
    defaultOptions: {
      mutate: {
        errorPolicy: linkOptions?.debug?.logging ? 'all' : undefined,
        context: defaultContext,
      },
      query: {
        context: defaultContext,
      },
      watchQuery: {
        context: defaultContext,
      },
    },
    mergeContext: true,
    defaultContext,
  });

  const errorLink = createErrorLink({
    client: apolloClient,
    mutationUpdaterFnMap,
    getUserGate,
  });

  const httpWsLink =
    terminatingLink ??
    createHttpWsLink({
      httpOptions: {
        ...httpOptions,
        uri: httpUri,
      },
      wsClient,
    });

  apolloClient.setLink(ApolloLink.from([errorLink, links.link, httpWsLink]));

  const result = {
    client: apolloClient,
    moduleContext,
    persistor: debounceStoreBuffer,
    restorer: deferredRestorer,
    wsClient,
    links: links.pick,
    mutationUpdaterFnMap,
    taggedEvict,
    getUserGate,
    /**
     * Removes window event listeners. Stops ApolloClient.
     *
     * Service will no longer function properly.
     */
    dispose: async () => {
      apolloClient.stop();
      disposeOnlineGate();
      await wsClient?.close();
    },
  };

  actions?.forEach((fn) => {
    fn(result);
  });

  return result;
}
