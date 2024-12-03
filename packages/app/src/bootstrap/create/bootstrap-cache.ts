import { BootstrapCache } from '../utils/bootstrap-cache';
import { localStorageKey, LocalStoragePrefix } from '../utils/local-storage-key';

export function createDefaultBootstrapCacheParams(): ConstructorParameters<
  typeof BootstrapCache
>[0] {
  return {
    key: localStorageKey(LocalStoragePrefix.BOOTSTRAP, 'cache'),
    storage: window.localStorage,
  };
}

export function createDefaultBootstrapCache() {
  return new BootstrapCache(createDefaultBootstrapCacheParams());
}
