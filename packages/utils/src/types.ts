export type Maybe<T> = T | null | undefined;

export type MaybePromise<T> = T | Promise<T>;

export type MaybeFunction<T> = T | (() => T);

export type MaybeValue<T> = MaybeFunction<MaybePromise<Maybe<T>>>;

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

/**
 * @source https://stackoverflow.com/questions/74852202/typescript-pick-only-properties-key-that-starts-with-a-target-string
 */
export type PickStartsWith<T extends object, S extends string> = {
  [K in keyof T as K extends `${S}${infer _R}` ? K : never]: T[K];
};

export type OmitStartsWith<T extends object, S extends string> = Omit<T, `${S}${string}`>;

/**
 * Types copied from package 'ts-essentials'
 * Added option to extend Primitive within DeepPartial
 * Renamed Deep to be in suffix
 */
export type Primitive = string | number | boolean | bigint | symbol | undefined | null;

// eslint-disable-next-line @typescript-eslint/ban-types
export type Builtin = Primitive | Function | Date | Error | RegExp;

export type IsAny<Type> = 0 extends 1 & Type ? true : false;

export type IsUnknown<Type> = IsAny<Type> extends true
  ? false
  : unknown extends Type
    ? true
    : false;

export type IsTuple<Type> = Type extends readonly unknown[]
  ? unknown[] extends Type
    ? never
    : Type
  : never;

export type PartialDeep<Type, TIn = never> = Type extends Exclude<Builtin | TIn, Error>
  ? Type
  : Type extends Map<infer Keys, infer Values>
    ? Map<PartialDeep<Keys, TIn>, PartialDeep<Values, TIn>>
    : Type extends ReadonlyMap<infer Keys, infer Values>
      ? ReadonlyMap<PartialDeep<Keys, TIn>, PartialDeep<Values, TIn>>
      : Type extends WeakMap<infer Keys, infer Values>
        ? WeakMap<PartialDeep<Keys, TIn>, PartialDeep<Values, TIn>>
        : Type extends Set<infer Values>
          ? Set<PartialDeep<Values, TIn>>
          : Type extends ReadonlySet<infer Values>
            ? ReadonlySet<PartialDeep<Values, TIn>>
            : Type extends WeakSet<infer Values>
              ? WeakSet<PartialDeep<Values, TIn>>
              : Type extends readonly (infer Values)[]
                ? Type extends IsTuple<Type>
                  ? {
                      [Key in keyof Type]?: PartialDeep<Type[Key], TIn>;
                    }
                  : Type extends Values[]
                    ? (PartialDeep<Values, TIn> | undefined)[]
                    : readonly (PartialDeep<Values, TIn> | undefined)[]
                : Type extends Promise<infer Value>
                  ? Promise<PartialDeep<Value, TIn>>
                  : Type extends object
                    ? {
                        [Key in keyof Type]?: PartialDeep<Type[Key], TIn>;
                      }
                    : IsUnknown<Type> extends true
                      ? unknown
                      : Partial<Type>;
