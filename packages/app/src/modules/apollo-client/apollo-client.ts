import { InMemoryCache } from '@apollo/client';
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev';
import { CachePersistor } from 'apollo3-cache-persist';

import { LocalStoragePrefix, localStorageKey } from '../storage/local-storage';

import { CustomApolloClient } from './custom-apollo-client';
import { typePolicies } from './policies';
import { TypePersistentStorage } from './policy/persist';

let HTTP_URL: string;
let WS_URL: string;
if (import.meta.env.MODE === 'production') {
  HTTP_URL = import.meta.env.VITE_GRAPHQL_HTTP_URL;
  WS_URL = import.meta.env.VITE_GRAPHQL_WS_URL;
} else {
  HTTP_URL = `${location.origin}/graphql`;
  WS_URL = `ws://${location.host}/graphql-ws`;

  loadDevMessages();
  loadErrorMessages();
}

const cache = new InMemoryCache({
  typePolicies,
});

const persistor = new CachePersistor({
  cache,
  key: localStorageKey(LocalStoragePrefix.APOLLO, 'cache'),
  storage: new TypePersistentStorage({
    storage: window.localStorage,
    serialize: (value) => JSON.stringify(value),
    typePolicies,
  }),
});

/**
 * Not all browsers support top-level await.
 * Exporting promise instead.
 */
export const customApolloClientPromise = new Promise<CustomApolloClient>((res, rej) => {
  void (async () => {
    try {
      await persistor.restore();

      const client = new CustomApolloClient({
        cache,
        persistor,
        typePolicies,
        httpLinkOptions: {
          uri: HTTP_URL,
        },
        wsClientOptions: {
          url: WS_URL,
        },
      });

      res(client);
    } catch (err) {
      rej(err);
    }
  })();
});
