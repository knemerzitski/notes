import { Emitter } from 'mitt';

export interface PersistorEvents {
  isPending: boolean;
}

export interface Persistor {
  on: Emitter<PersistorEvents>['on'];
  off: Emitter<PersistorEvents>['off'];
  flush(): Promise<void>;
  isPending(): boolean;
}

export interface Restore {
  restore(): Promise<void>;
}

export interface Restorer {
  restore(): Promise<void>;
  readonly status: 'init' | 'restoring' | 'done';
}

/**
 * Key based asynchrounous persistence
 */
export interface Store {
  get(key: string): Promise<unknown>;
  getMany(keys: readonly string[]): Promise<unknown[]>;
  set(key: string, value: unknown): Promise<void>;
  setMany(entries: readonly [string, unknown][]): Promise<void>;
  remove(key: string): Promise<void>;
  removeMany(keys: readonly string[]): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Collect serializables for bulk persistence
 */
export interface StoreSetBuffer {
  has(key: string): boolean;
  set(key: string, value: Serializable): void;
  remove(key: string): void;
}

export interface Serializable {
  serialize(): unknown;
}
