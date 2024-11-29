import {
  ApolloClient,
  ApolloLink,
  DefaultContext,
  InMemoryCache,
  PossibleTypesMap,
} from '@apollo/client';
import { CachePersistor, PersistentStorage } from 'apollo3-cache-persist';
import { WebSocketClient } from '../ws/websocket-client';
import { createLinks } from './links';
import {
  AppContext,
  CacheReadyCallbacks,
  GlobalOperationVariables,
  GraphQLServiceAction,
  MutationDefinitions,
  TypePoliciesList,
} from '../types';
import { addTypePolicies, createTypePolicies } from './type-policies';
import { Maybe } from '~utils/types';
import { TaggedEvict, TaggedEvictOptionsList } from '../utils/tagged-evict';
import { CacheRestorer } from '../utils/cache-restorer';
import { createRunCacheReadyCallbacks } from './cache-ready-callbacks';
import { createMutationUpdaterFunctionMap } from './mutation-updater-map';
import { createOnlineGate } from '../utils/online-gate';
import { createUsersGates, initUsersGates } from '../utils/user-gate';
import { createErrorLink } from './error-link';
import { createHttpWsLink } from './http-ws-link';
import { isQueryOperation } from '@apollo/client/utilities';

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
  context,
  skipRestoreCache = false,
  linkOptions,
  actions,
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
  context: {
    getUserId(cache: InMemoryCache): Maybe<string>;
  };
  linkOptions?: Parameters<typeof createLinks>[0]['options'];
  actions?: GraphQLServiceAction[];
}) {
  const mutationUpdaterFnMap = createMutationUpdaterFunctionMap(mutationDefinitions);

  const appContext: AppContext = {
    get userId() {
      return context.getUserId(cache);
    },
  };

  const cache = new InMemoryCache({
    gcExplicitWrites: true,
  });

  possibleTypesList?.forEach((possibleTypes) => {
    cache.policies.addPossibleTypes(possibleTypes);
  });

  const persistor = new CachePersistor({
    //@ts-expect-error TODO fix this
    cache,
    key: storageKey,
    storage,
  });

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
    appContext,
    variablesUserIdKey: GlobalOperationVariables.USER_ID,
    get isCacheLocked() {
      return restorer.status !== 'done';
    },
  });

  addTypePolicies(typePolicies, cache);

  const taggedEvict = new TaggedEvict(evictOptionsList);

  const wsClient = wsUrl
    ? new WebSocketClient(
        {
          get userId() {
            return appContext.userId;
          },
        },
        {
          url: wsUrl,
        }
      )
    : undefined;

  const links = createLinks({
    appContext,
    wsClient,
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
    const hasNoMutations = links.pick.statsLink.getGlobalStats().mutation.ongoing == 0;
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
    appContext,
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
