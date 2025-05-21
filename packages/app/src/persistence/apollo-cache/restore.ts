import { ApolloCache } from '@apollo/client';

import { Restore, Store } from '../types';

export class ApolloCacheRestore implements Restore {
  private readonly store;
  private readonly key;
  private readonly cache;

  constructor({
    key,
    cache,
    store,
  }: {
    key: string;
    cache: ApolloCache<unknown>;
    store: Pick<Store, 'get'>;
  }) {
    this.key = key;
    this.store = store;
    this.cache = cache;
  }

  async restore() {
    const data = await this.store.get(this.key);
    if (!data) {
      return;
    }

    this.cache.restore(data);
  }
}
