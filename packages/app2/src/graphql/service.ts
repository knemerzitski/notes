import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  PossibleTypesMap,
} from '@apollo/client';
import { MyApolloClient as MyApolloClient } from './apollo/apollo-client';
import { TypePoliciesEvictor } from './policy/evict';
import { CachePersistor } from 'apollo3-cache-persist';
import { TypePoliciesPersistentStorage } from './policy/persist';
import { WebSocketClient } from './ws/websocket-client';
import { createHttpWsLink, createLinks } from './create/links';
import { AppContext, GlobalRequestVariables, TypePoliciesList } from './types';
import { createTypePolicies } from './create/type-policies';
import { fieldArrayToMap } from './utils/field-array-to-map';
import { localStorageKey, LocalStoragePrefix } from '../local-storage';
import { Maybe } from '~utils/types';

export function createGraphQLService({
  httpUri,
  wsUrl,
  terminatingLink,
  possibleTypes,
  typePoliciesList,
  storage,
  context,
}: {
  httpUri: string;
  wsUrl: string | undefined;
  terminatingLink?: ApolloLink;
  possibleTypes?: PossibleTypesMap;
  typePoliciesList: TypePoliciesList;
  storage?: Storage;
  context: {
    getUserId(cache: InMemoryCache): Maybe<string>;
  };
}) {
  const cache = new InMemoryCache({
    possibleTypes,
  });

  const appContext: AppContext = {
    get userId() {
      return context.getUserId(cache);
    },
  };

  const typePolicies = createTypePolicies(typePoliciesList, {
    appContext,
    variablesUserIdKey: GlobalRequestVariables.USER_ID,
  });
  cache.policies.addTypePolicies(typePolicies);

  // TODO tmp, add policy somewhere else?
  cache.policies.addTypePolicies({
    Query: {
      fields: {
        persistedMutations: fieldArrayToMap('id'),
      },
    },
    PersistedMutation: {
      merge: true,
    },
  });

  const persistor = new CachePersistor({
    cache,
    key: localStorageKey(LocalStoragePrefix.APOLLO, 'cache'),
    storage: new TypePoliciesPersistentStorage({
      cache,
      storage: storage ?? window.localStorage,
      serialize: (value) => JSON.stringify(value),
      typePolicies,
    }),
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

  const apolloClient = new MyApolloClient({
    client: new ApolloClient({
      cache,
      link: ApolloLink.from([links.link, httpWsLink]),
    }),
    evictor: new TypePoliciesEvictor({
      cache,
      typePolicies,
    }),
  });

  return {
    apolloClient,
    persistor,
    wsClient,
    links: links.pick,
  };
}
