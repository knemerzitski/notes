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
    key: storageKey,
    storage,
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
