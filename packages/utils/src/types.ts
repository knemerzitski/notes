export type Maybe<T> = T | undefined;

export type MaybePromise<T> = T | Promise<T>;

export interface Entry<Key, Value> {
  key: Key;
  value: Value;
}
