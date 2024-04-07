export type Maybe<T> = T | null | undefined;

export type MaybePromise<T> = T | Promise<T>;

export interface Entry<Key, Value> {
  key: Key;
  value: Value;
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepPartial<T> = {
  [Key in keyof T]?: T[Key] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[Key] extends object | undefined
      ? DeepPartial<T[Key]>
      : T[Key];
};

export type DeepReplace<T, From, To> = T extends From
  ? To
  : T extends (infer U)[]
    ? DeepReplace<U, From, To>[]
    : T extends object
      ? {
          [Key in keyof T]: DeepReplace<T[Key], From, To>;
        }
      : T;
