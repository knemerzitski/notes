import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  PossibleTypesMap,
} from '@apollo/client';
import { CachePersistor, LocalStorageWrapper } from 'apollo3-cache-persist';
import { WebSocketClient } from './ws/websocket-client';
import { createHttpWsLink, createLinks } from './create/links';
import {
  AppContext,
  GlobalRequestVariables,
  TypePoliciesList,
  UpdateHandlersByName,
} from './types';
import { addTypePolicies, createTypePolicies } from './create/type-policies';
import { localStorageKey, LocalStoragePrefix } from '../local-storage';
import { Maybe } from '~utils/types';
import { TaggedEvict, TaggedEvictOptionsList } from './utils/tagged-evict';

export function createGraphQLService({
  httpUri,
  wsUrl,
  terminatingLink,
  possibleTypes,
  typePoliciesList,
  evictOptionsList,
  updateHandlersByName,
  storage,
  context,
}: {
  httpUri: string;
  wsUrl: string | undefined;
  terminatingLink?: ApolloLink;
  possibleTypes?: PossibleTypesMap;
  typePoliciesList: TypePoliciesList;
  evictOptionsList: TaggedEvictOptionsList;
  updateHandlersByName: UpdateHandlersByName;
  storage?: Storage;
  context: {
    getUserId(cache: InMemoryCache): Maybe<string>;
  };
}) {
  const appContext: AppContext = {
    get userId() {
      return context.getUserId(cache);
    },
  };

  const typePolicies = createTypePolicies(typePoliciesList, {
    appContext,
    variablesUserIdKey: GlobalRequestVariables.USER_ID,
  });

  const cache = new InMemoryCache({
    possibleTypes,
    gcExplicitWrites: true,
  });
  addTypePolicies(typePolicies, cache);

  const taggedEvict = new TaggedEvict(evictOptionsList);

  const persistor = new CachePersistor({
    cache,
    key: localStorageKey(LocalStoragePrefix.APOLLO, 'cache'),
    storage: storage ?? new LocalStorageWrapper(window.localStorage),
  });

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
    wsClient,
    links: links.pick,
    updateHandlersByName,
    taggedEvict,
  };
}
