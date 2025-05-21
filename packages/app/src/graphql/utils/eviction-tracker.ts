import { ApolloCache } from '@apollo/client';

import { IdFragmentCache } from './id-fragment-cache';
import { identifyOrError } from './identify';

export interface CacheObject {
  readonly __typename: string;
  readonly id: string;
}

type Callback = () => void;

export class CacheEvictionTracker {
  private readonly callbacksByDataId = new Map<string, Set<Callback>>();

  private readonly idFragmentCache = new IdFragmentCache();

  constructor(
    private readonly cache: Pick<
      ApolloCache<unknown>,
      'gc' | 'watchFragment' | 'identify'
    >
  ) {
    const _cacheGc = cache.gc.bind(cache);
    cache.gc = (...args) => {
      const removedDataIds = _cacheGc(...args);
      removedDataIds.forEach((dataId) => {
        this.onEvicted(dataId);
      });
      return removedDataIds;
    };
  }

  track(
    { __typename, id }: CacheObject,
    onEvictedCallback: Callback,
    options?: {
      /**
       * Stop tracking once object is evicted
       * @default false
       */
      stopOnEvicted?: boolean;
    }
  ) {
    const dataId = identifyOrError(
      {
        __typename,
        id,
      },
      this.cache
    );

    const callbacks = this.getCallbackSet(dataId);
    callbacks.add(onEvictedCallback);

    const observable = this.cache.watchFragment({
      fragment: this.idFragmentCache.get(__typename),
      from: dataId,
    });

    const subscription = observable.subscribe((value) => {
      if (!value.complete) {
        this.onEvicted(dataId);
      }
    });

    const stopTracking = () => {
      subscription.unsubscribe();
      callbacks.delete(onEvictedCallback);
      callbacks.delete(stopTracking);

      this.callbacksCleanup(__typename, id);
    };

    if (options?.stopOnEvicted) {
      callbacks.add(stopTracking);
    }

    return stopTracking;
  }

  private getCallbackSet(dataId: string) {
    let callbacks = this.callbacksByDataId.get(dataId);
    if (!callbacks) {
      callbacks = new Set();
      this.callbacksByDataId.set(dataId, callbacks);
    }
    return callbacks;
  }

  private callbacksCleanup(typename: string, id: string) {
    const dataId = identifyOrError(
      {
        __typename: typename,
        id,
      },
      this.cache
    );

    const callbacks = this.callbacksByDataId.get(dataId);
    if (callbacks && callbacks.size === 0) {
      this.callbacksByDataId.delete(dataId);

      this.idFragmentCache.delete(typename);
    }
  }

  private onEvicted(dataId: string) {
    const callbacks = this.callbacksByDataId.get(dataId);
    if (!callbacks) {
      return;
    }

    callbacks.forEach((callback) => {
      callback();
    });
  }
}
