import { InMemoryCache } from '@apollo/client';

import { DeferredRestorer } from '../../persistence/utils/deferred-restorer';
import { CacheReadyCallbacks } from '../types';

export function createRunCacheReadyCallbacks({
  callbacks,
  restorer,
  cache,
}: {
  callbacks: CacheReadyCallbacks;
  restorer: DeferredRestorer;
  cache: InMemoryCache;
}) {
  void restorer.restored().then(() => {
    for (const callback of callbacks) {
      callback(cache);
    }
  });
}
