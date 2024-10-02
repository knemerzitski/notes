import { ApolloClient, InMemoryCache, PossibleTypesMap } from '@apollo/client';
import { CustomApolloClient } from '../apollo-client';
import { TypePoliciesEvictor } from '../policy/evict';
import { Maybe } from '~utils/types';
import { CachePersistor } from 'apollo3-cache-persist';
import { localStorageKey, LocalStoragePrefix } from '~/local-storage';
import { TypePoliciesPersistentStorage } from '../policy/persist';
import { WebSocketClient } from '../websocket-client';
import { createLinks } from './links';
import { AppContext, GlobalRequestVariables, TypePoliciesList } from '../types';
import { createTypePolicies } from './type-policies';

export function createApolloClient({
  httpUri,
  wsUrl,
  possibleTypes,
  typePoliciesList,
  context,
}: {
  httpUri: string;
  wsUrl: string | undefined;
  possibleTypes?: PossibleTypesMap;
  typePoliciesList: TypePoliciesList;
  context: {
    getUserId(cache: InMemoryCache): Maybe<string>;
  };
}): CustomApolloClient {
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

  const persistor = new CachePersistor({
    cache,
    key: localStorageKey(LocalStoragePrefix.APOLLO, 'cache'),
    storage: new TypePoliciesPersistentStorage({
      cache,
      storage: window.localStorage,
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

  const links = createLinks({
    httpUri,
    appContext,
    wsClient,
    debug: {
      throttle: 0,
    },
  });

  return new CustomApolloClient({
    client: new ApolloClient({
      cache,
      link: links.link,
    }),
    wsClient,
    evictor: new TypePoliciesEvictor({
      cache,
      typePolicies,
    }),
    statsLink: links.statsLink,
    errorLink: links.errorLink,
    persistor,
  });
}
