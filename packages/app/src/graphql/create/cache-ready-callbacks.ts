import { InMemoryCache } from '@apollo/client';

import { CacheReadyCallbacks } from '../types';
import { CacheRestorer } from '../utils/cache-restorer';

export function createRunCacheReadyCallbacks({
  callbacks,
  restorer,
  cache,
}: {
  callbacks: CacheReadyCallbacks;
  restorer: CacheRestorer;
  cache: InMemoryCache;
}) {
  void restorer.restored().then(() => {
    for (const callback of callbacks) {
      callback(cache);
    }
  });
}
