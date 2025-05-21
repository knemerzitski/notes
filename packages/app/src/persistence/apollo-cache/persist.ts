import { ApolloCache } from '@apollo/client';

import { Serializable, StoreSetBuffer } from '../types';

import { onCacheWrite } from './on-cache-write';

export class ApolloCachePersist {
  private readonly storeBuffer;
  private readonly serializable;
  private readonly key;

  constructor({
    key,
    cache,
    storeBuffer,
  }: {
    key: string;
    cache: ApolloCache<unknown>;
    storeBuffer: Pick<StoreSetBuffer, 'set'>;
  }) {
    this.storeBuffer = storeBuffer;
    this.serializable = new ApolloCacheSerializable(cache);
    this.key = key;

    onCacheWrite(cache, this.persist.bind(this));
  }

  private persist() {
    this.storeBuffer.set(this.key, this.serializable);
  }
}

class ApolloCacheSerializable implements Serializable {
  constructor(private cache: Pick<ApolloCache<unknown>, 'extract'>) {}

  serialize(): unknown {
    return this.cache.extract();
  }
}
