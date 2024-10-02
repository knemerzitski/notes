import { ApolloClient, InMemoryCache } from '@apollo/client';
import { CustomApolloClient } from '../apollo-client';
import { TypePoliciesEvictor } from '../policy/evict';
import { createTypePolicies, TypePoliciesList } from './create-type-policies';
import { Maybe } from '~utils/types';
import { CachePersistor } from 'apollo3-cache-persist';
import { localStorageKey, LocalStoragePrefix } from '~/local-storage';
import { TypePoliciesPersistentStorage } from '../policy/persist';
import { AppContext } from './app-context';
import { WebSocketClient } from '../websocket-client';
import { createLinks } from './create-links';
import { GlobalRequestVariables } from '../types';

export function createApolloClient({
  httpUri,
  wsUrl,
  typePoliciesList,
  context,
}: {
  httpUri: string;
  wsUrl: string | undefined;
  typePoliciesList: TypePoliciesList;
  context: {
    getUserId(cache: InMemoryCache): Maybe<string>;
  };
}): CustomApolloClient {
  const cache = new InMemoryCache();

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
