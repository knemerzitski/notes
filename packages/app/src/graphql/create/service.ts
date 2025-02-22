import {
  ApolloClient,
  ApolloLink,
  DefaultContext,
  InMemoryCache,
  PossibleTypesMap,
} from '@apollo/client';
import { isQueryOperation } from '@apollo/client/utilities';
import { CachePersistor, PersistentStorage } from 'apollo3-cache-persist';

import { OperationTypeNode } from 'graphql';

import {
  CacheReadyCallbacks,
  GraphQLServiceAction,
  MutationDefinitions,
  TypePoliciesList,
} from '../types';
import { CacheRestorer } from '../utils/cache-restorer';

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
import { Logger } from '~utils/logging';

export function createGraphQLService({
  httpUri,
  wsUrl,
  terminatingLink,
  possibleTypesList,
  typePoliciesList,
  cacheReadyCallbacks,
  evictOptionsList,
  mutationDefinitions,
  storageKey,
  storage,
  skipRestoreCache = false,
  purgeCache = false,
  linkOptions,
  actions,
  logger,
}: {
  httpUri: string;
  wsUrl: string | undefined;
  terminatingLink?: ApolloLink;
  possibleTypesList?: PossibleTypesMap[];
  typePoliciesList: TypePoliciesList;
  cacheReadyCallbacks: CacheReadyCallbacks;
  evictOptionsList: TaggedEvictOptionsList;
  mutationDefinitions: MutationDefinitions;
  storageKey: string;
  storage: PersistentStorage<string>;
  /**
   * Call persistor.restore() immediately.
   * Restore status can be checked in `restorer`.
   * @default false
   */
  skipRestoreCache?: boolean;
  /**
   * Deletes the cache
   * @default false
   */
  purgeCache?: boolean;
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

  const persistor = new CachePersistor({
    cache,
    key: storageKey,
    storage,
  });

  if (purgeCache) {
    void persistor.purge();
  }

  const restorer = new CacheRestorer(persistor);
  if (!skipRestoreCache) {
    void restorer.restore();
  }

  createRunCacheReadyCallbacks({
    callbacks: cacheReadyCallbacks,
    restorer,
    cache,
  });

  const typePolicies = createTypePolicies(typePoliciesList, {
    logger: logger?.extend('policy'),
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
  void restorer.restored().then(() => {
    initUsersGates(getUserGate, cache);
  });

  // When app starts, block all queries until mutations have been procesed.
  // Reduces data inconsistency between server and client
  const queryGate = links.pick.gateLink.create((operation) => {
    return isQueryOperation(operation.query);
  });
  queryGate.close();
  const offQueryGateOpen = links.pick.statsLink.getGlobalEventBus().on('*', () => {
    const hasNoMutations =
      links.pick.statsLink.getGlobalOngoing().byType(OperationTypeNode.MUTATION) == 0;
    if (hasNoMutations) {
      // No longer need to listen to stats events
      offQueryGateOpen();
      queryGate.open();
    }
  });

  const defaultContext: DefaultContext = {
    getUserGate,
    taggedEvict,
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
      httpUri,
      wsClient,
    });

  apolloClient.setLink(ApolloLink.from([errorLink, links.link, httpWsLink]));

  const result = {
    client: apolloClient,
    persistor,
    restorer,
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
    dispose: () => {
      apolloClient.stop();
      disposeOnlineGate();
    },
  };

  actions?.forEach((fn) => {
    fn(result);
  });

  return result;
}
