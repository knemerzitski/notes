import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  PossibleTypesMap,
} from '@apollo/client';
import { CachePersistor, PersistentStorage } from 'apollo3-cache-persist';
import { WebSocketClient } from './ws/websocket-client';
import { createHttpWsLink, createLinks } from './create/links';
import {
  AppContext,
  GlobalRequestVariables,
  MutationOperations,
  TypePoliciesList,
} from './types';
import { addTypePolicies, createTypePolicies } from './create/type-policies';
import { Maybe } from '~utils/types';
import { TaggedEvict, TaggedEvictOptionsList } from './utils/tagged-evict';
import { createUpdateHandlersByName } from './create/update-handlers-by-name';
import { CacheRestorer } from './utils/cache-restorer';

export function createGraphQLService({
  httpUri,
  wsUrl,
  terminatingLink,
  possibleTypes,
  typePoliciesList,
  evictOptionsList,
  mutationOperations,
  storageKey,
  storage,
  context,
  skipRestoreCache = false,
}: {
  httpUri: string;
  wsUrl: string | undefined;
  terminatingLink?: ApolloLink;
  possibleTypes?: PossibleTypesMap;
  typePoliciesList: TypePoliciesList;
  evictOptionsList: TaggedEvictOptionsList;
  mutationOperations: MutationOperations;
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
}) {
  const updateHandlersByName = createUpdateHandlersByName(mutationOperations);

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

  const typePolicies = createTypePolicies(typePoliciesList, {
    appContext,
    variablesUserIdKey: GlobalRequestVariables.USER_ID,
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
      appContext,
      wsClient,
    });

  const links = createLinks({
    cache,
    debug: {
      throttle: 0,
    },
  });

  const apolloClient = new ApolloClient({
    cache,
    link: ApolloLink.from([links.link, httpWsLink]),
  });

  return {
    client: apolloClient,
    persistor,
    restorer,
    wsClient,
    links: links.pick,
    updateHandlersByName,
    taggedEvict,
  };
}
