export type Maybe<T> = T | null | undefined;

export type MaybePromise<T> = T | Promise<T>;

export type MaybeFunction<T> = T | (() => T);

export type MaybeValue<T> = MaybeFunction<MaybePromise<Maybe<T>>>;

export interface Entry<Key, Value> {
  key: Key;
  value: Value;
}

// @source https://stackoverflow.com/questions/57103834/typescript-omit-a-property-from-all-interfaces-in-a-union-but-keep-the-union-s
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export type ExcludeUndefined<T> = Exclude<T, undefined>;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DistributivePartialBy<T, K extends keyof T> = DistributiveOmit<T, K> &
  Partial<Pick<T, K>>;

export type WithRequired<T, TKey extends keyof T> = T & { [Key in TKey]-?: T[Key] };

export type ReplaceWith<T extends object, R extends object> = Omit<T, keyof R> & R;

export type PickByPath<T, S extends string> = S extends ''
  ? T
  : T extends (infer U)[]
    ? PickByPath<U, S>
    : T extends object
      ? S extends `${infer Key}.${infer U}`
        ? Key extends keyof T
          ? PickByPath<T[Key], U>
          : never
        : S extends keyof T
          ? T[S]
          : never
      : never;

export type OmitNever<T> = {
  [Key in keyof T as T[Key] extends never ? never : Key]: T[Key];
};

export type OmitUndefined<T> = {
  [Key in keyof T as T[Key] extends undefined ? never : Key]: T[Key];
};

export type ReplaceDeep<T, Source, Target, Stop = never> = T extends Stop
  ? T
  : T extends Source
    ? Target
    : T extends (infer U)[]
      ? ReplaceDeep<U, Source, Target, Stop>[]
      : T extends Builtin
        ? T
        : T extends object
          ? {
              [Key in keyof T]: ReplaceDeep<T[Key], Source, Target, Stop>;
            }
          : T;

export type ExcludeNullable<T, Key extends keyof NonNullable<T>> = NonNullable<T> & {
  [key in Key]-?: Exclude<NonNullable<T>[key], null | undefined>;
};

export type ReadonlyDeep<T, Stop = never> = T extends Stop
  ? T
  : Readonly<
      T extends (infer U)[]
        ? ReadonlyDeep<Readonly<U>, Stop>[]
        : T extends object
          ? {
              [Key in keyof T]: ReadonlyDeep<T[Key], Stop>;
            }
          : T
    >;

export type PickValue = 1;

export type PickerDeep<T, P> = T extends P
  ? PickValue
  : T extends (infer U)[]
    ? PickerDeep<U, P>
    : T extends object
      ? {
          [Key in keyof T]?: T[Key] extends P ? PickValue : PickerDeep<T[Key], P>;
        }
      : never;

export type PickDeep<T, V extends PickerDeep<T, P>, P = Primitive> = T extends P
  ? T
  : T extends (infer U)[]
    ? V extends PickerDeep<U, P>
      ? PickDeep<U, V, P>[]
      : never
    : T extends object
      ? OmitNever<{
          [Key in keyof T]: Key extends keyof V
            ? V[Key] extends PickValue
              ? T[Key]
              : Exclude<T[Key], undefined> extends object
                ? V[Key] extends PickerDeep<T[Key], P>
                  ? PickDeep<T[Key], V[Key], P>
                  : never
                : never
            : never;
        }>
      : never;

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

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type Builtin = Primitive | Function | Date | Error | RegExp;

export type IsAny<Type> = 0 extends 1 & Type ? true : false;

export type IsUnknown<Type> =
  IsAny<Type> extends true ? false : unknown extends Type ? true : false;

export type IsTuple<Type> = Type extends readonly unknown[]
  ? unknown[] extends Type
    ? never
    : Type
  : never;

export type PartialDeep<Type, Stop = never> =
  Type extends Exclude<Builtin | Stop, Error>
    ? Type
    : Type extends Map<infer Keys, infer Values>
      ? Map<PartialDeep<Keys, Stop>, PartialDeep<Values, Stop>>
      : Type extends ReadonlyMap<infer Keys, infer Values>
        ? ReadonlyMap<PartialDeep<Keys, Stop>, PartialDeep<Values, Stop>>
        : Type extends WeakMap<infer Keys, infer Values>
          ? WeakMap<PartialDeep<Keys, Stop>, PartialDeep<Values, Stop>>
          : Type extends Set<infer Values>
            ? Set<PartialDeep<Values, Stop>>
            : Type extends ReadonlySet<infer Values>
              ? ReadonlySet<PartialDeep<Values, Stop>>
              : Type extends WeakSet<infer Values>
                ? WeakSet<PartialDeep<Values, Stop>>
                : Type extends readonly (infer Values)[]
                  ? Type extends IsTuple<Type>
                    ? {
                        [Key in keyof Type]?: PartialDeep<Type[Key], Stop>;
                      }
                    : Type extends Values[]
                      ? (PartialDeep<Values, Stop> | undefined)[]
                      : readonly (PartialDeep<Values, Stop> | undefined)[]
                  : Type extends Promise<infer Value>
                    ? Promise<PartialDeep<Value, Stop>>
                    : Type extends object
                      ? {
                          [Key in keyof Type]?: PartialDeep<Type[Key], Stop>;
                        }
                      : IsUnknown<Type> extends true
                        ? unknown
                        : Partial<Type>;
