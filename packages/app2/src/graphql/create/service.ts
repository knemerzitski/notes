import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  PossibleTypesMap,
} from '@apollo/client';
import { CachePersistor, PersistentStorage } from 'apollo3-cache-persist';
import { WebSocketClient } from '../ws/websocket-client';
import { createHttpWsLink, createLinks } from './links';
import {
  AppContext,
  CacheReadyCallbacks,
  GlobalOperationVariables,
  DocumentUpdateDefinitions,
  TypePoliciesList,
} from '../types';
import { addTypePolicies, createTypePolicies } from './type-policies';
import { Maybe } from '~utils/types';
import { TaggedEvict, TaggedEvictOptionsList } from '../utils/tagged-evict';
import { CacheRestorer } from '../utils/cache-restorer';
import { createRunCacheReadyCallbacks } from './cache-ready-callbacks';
import { createDocumentUpdaterMap } from './document-updater-map';

export function createGraphQLService({
  httpUri,
  wsUrl,
  terminatingLink,
  possibleTypes,
  typePoliciesList,
  cacheReadyCallbacks,
  evictOptionsList,
  documentUpdateDefinitions,
  storageKey,
  storage,
  context,
  skipRestoreCache = false,
  linksDebug,
}: {
  httpUri: string;
  wsUrl: string | undefined;
  terminatingLink?: ApolloLink;
  possibleTypes?: PossibleTypesMap;
  typePoliciesList: TypePoliciesList;
  cacheReadyCallbacks: CacheReadyCallbacks;
  evictOptionsList: TaggedEvictOptionsList;
  documentUpdateDefinitions: DocumentUpdateDefinitions;
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
  linksDebug?: Parameters<typeof createLinks>[0]['debug'];
}) {
  const documentUpdaterMap = createDocumentUpdaterMap(documentUpdateDefinitions);

  const appContext: AppContext = {
    get userId() {
      return context.getUserId(cache);
    },
  };

  const cache = new InMemoryCache({
    possibleTypes,
    gcExplicitWrites: true,
  });

  const persistor = new CachePersistor({
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

  const httpWsLink =
    terminatingLink ??
    createHttpWsLink({
      httpUri,
      wsClient,
    });

  const links = createLinks({
    appContext,
    wsClient,
    cache,
    debug: linksDebug,
  });

  const apolloClient = new ApolloClient({
    cache,
    link: ApolloLink.from([links.link, httpWsLink]),
    defaultOptions: {
      mutate: {
        errorPolicy: linksDebug?.logging ? 'all' : undefined,
      },
    },
  });

  return {
    client: apolloClient,
    persistor,
    restorer,
    wsClient,
    links: links.pick,
    documentUpdaterMap,
    taggedEvict,
  };
}
