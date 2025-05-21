import { Store } from '../types';

export class NoStore implements Store {
  get(_key: string): Promise<unknown> {
    return Promise.resolve();
  }

  getMany(keys: string[]): Promise<unknown[]> {
    return Promise.resolve(keys.map(() => undefined));
  }

  set(_key: string, _value: unknown): Promise<void> {
    return Promise.resolve();
  }

  setMany(_entries: [string, unknown][]): Promise<void> {
    return Promise.resolve();
  }

  remove(_key: string): Promise<void> {
    return Promise.resolve();
  }

  removeMany(_keys: string[]): Promise<void> {
    return Promise.resolve();
  }

  clear(): Promise<void> {
    return Promise.resolve();
  }
}
