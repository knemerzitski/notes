import { get, getMany, set, UseStore, setMany, delMany, del, clear } from 'idb-keyval';

import { Store } from '../types';

export class IndexedDBStore implements Store {
  constructor(private readonly store: UseStore) {}

  get(key: string): Promise<unknown> {
    return get(key, this.store);
  }

  getMany(keys: string[]): Promise<unknown[]> {
    return getMany(keys, this.store);
  }

  set(key: string, value: unknown): Promise<void> {
    return set(key, value, this.store);
  }

  setMany(entries: [string, unknown][]): Promise<void> {
    return setMany(entries, this.store);
  }

  remove(key: string): Promise<void> {
    return del(key);
  }

  removeMany(keys: string[]): Promise<void> {
    return delMany(keys, this.store);
  }

  clear(): Promise<void> {
    return clear(this.store);
  }
}
