import { InMemoryCache } from '@apollo/client';
import { typePolicies } from '../../modules/apollo-client/policies';
import { CachePersistor, PersistentStorage } from 'apollo3-cache-persist';
import {
  CustomApolloClient,
  CustomApolloClientParams,
} from '../../modules/apollo-client/custom-apollo-client';

export function createCache() {
  return new InMemoryCache({
    typePolicies,
  });
}

export function createCustomApolloClient(params: Partial<CustomApolloClientParams>) {
  const cache = params.cache ?? createCache();

  return new CustomApolloClient({
    cache: params.cache ?? createCache(),
    persistor:
      params.persistor ??
      new CachePersistor({
        cache,
        storage: new SimpleMemoryStorage(),
      }),
    typePolicies: params.typePolicies ?? typePolicies,
    ...params,
  });
}

class SimpleMemoryStorage implements PersistentStorage<string> {
  private storage = new Map<string, string>();

  getItem(key: string): string | Promise<string | null> | null {
    return this.storage.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.storage.set(key, value);
  }

  removeItem(key: string) {
    this.storage.delete(key);
  }
}
