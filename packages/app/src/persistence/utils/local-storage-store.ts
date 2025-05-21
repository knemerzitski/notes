/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Store } from '../types';

export class LocalStorageStore implements Store {
  private keyPrefix: string;

  constructor(
    private readonly store: Pick<
      typeof window.localStorage,
      'getItem' | 'setItem' | 'removeItem' | 'clear'
    >,
    options?: {
      keyPrefix?: string;
    }
  ) {
    this.keyPrefix = options?.keyPrefix ?? '';
  }

  get(key: string): Promise<unknown> {
    return this.mapGet(this.store.getItem(this.mapKey(key)));
  }

  getMany(keys: string[]): Promise<unknown[]> {
    return Promise.resolve(
      keys.map((key) => this.mapGet(this.store.getItem(this.mapKey(key))))
    );
  }

  set(key: string, value: unknown): Promise<void> {
    this.store.setItem(this.mapKey(key), JSON.stringify(value));

    return Promise.resolve();
  }

  setMany(entries: [string, unknown][]): Promise<void> {
    entries.map(([key, value]) => {
      this.store.setItem(this.mapKey(key), this.mapSet(value));
    });

    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    this.store.removeItem(this.mapKey(key));

    return Promise.resolve();
  }

  removeMany(keys: string[]): Promise<void> {
    keys.forEach((key) => {
      this.store.removeItem(this.mapKey(key));
    });

    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.store.clear();

    return Promise.resolve();
  }

  private mapKey(key: string) {
    return `${this.keyPrefix}${key}`;
  }

  private mapGet(value: unknown) {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }

    return;
  }

  private mapSet(value: unknown) {
    return JSON.stringify(value);
  }
}
