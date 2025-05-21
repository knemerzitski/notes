import { EventTickBatcher } from '../../../../utils/src/event-tick-batcher';

import { Store } from '../types';

export class GetManyStoreBatcher implements Pick<Store, 'get' | 'getMany'> {
  private readonly batcher;

  constructor(private readonly store: Pick<Store, 'get' | 'getMany'>) {
    this.batcher = new EventTickBatcher<string, unknown>(this.batchFn.bind(this));
  }

  get(key: string): Promise<unknown> {
    return this.batcher.load(key);
  }

  getMany(keys: readonly string[]): Promise<unknown[]> {
    return Promise.all(keys.map((key) => this.batcher.load(key)));
  }

  private batchFn(keys: readonly string[]): Promise<unknown[]> {
    return this.store.getMany(keys);
  }
}
