export type Maybe<T> = T | null | undefined;

export type MaybePromise<T> = T | Promise<T>;

export interface Entry<Key, Value> {
  key: Key;
  value: Value;
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepReplace<T, Source, Target> = T extends Source
  ? Target
  : T extends (infer U)[]
    ? DeepReplace<U, Source, Target>[]
    : T extends object
      ? {
          [Key in keyof T]: DeepReplace<T[Key], Source, Target>;
        }
      : T;

export type ExcludeNullable<T, Key extends keyof NonNullable<T>> = NonNullable<T> & {
  [key in Key]-?: Exclude<NonNullable<T>[key], null | undefined>;
};
