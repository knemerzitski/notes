import { BootstrapCache } from '../utils/bootstrap-cache';

export function createDefaultBootstrapCacheParams(): ConstructorParameters<
  typeof BootstrapCache
>[0] {
  return {
    key: 'bootstrap:app',
    storage: window.localStorage,
  };
}

export function createDefaultBootstrapCache() {
  return new BootstrapCache(createDefaultBootstrapCacheParams());
}
