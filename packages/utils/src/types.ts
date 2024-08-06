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

/**
 * Types copied from package 'ts-essentials'
 * Added option to extend Primitive within DeepPartial
 *
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

export type DeepPartial<Type, TPrimitive = never> = Type extends Exclude<
  Builtin | TPrimitive,
  Error
>
  ? Type
  : Type extends Map<infer Keys, infer Values>
    ? Map<DeepPartial<Keys, TPrimitive>, DeepPartial<Values, TPrimitive>>
    : Type extends ReadonlyMap<infer Keys, infer Values>
      ? ReadonlyMap<DeepPartial<Keys, TPrimitive>, DeepPartial<Values, TPrimitive>>
      : Type extends WeakMap<infer Keys, infer Values>
        ? WeakMap<DeepPartial<Keys, TPrimitive>, DeepPartial<Values, TPrimitive>>
        : Type extends Set<infer Values>
          ? Set<DeepPartial<Values, TPrimitive>>
          : Type extends ReadonlySet<infer Values>
            ? ReadonlySet<DeepPartial<Values, TPrimitive>>
            : Type extends WeakSet<infer Values>
              ? WeakSet<DeepPartial<Values, TPrimitive>>
              : Type extends readonly (infer Values)[]
                ? Type extends IsTuple<Type>
                  ? {
                      [Key in keyof Type]?: DeepPartial<Type[Key], TPrimitive>;
                    }
                  : Type extends Values[]
                    ? (DeepPartial<Values, TPrimitive> | undefined)[]
                    : readonly (DeepPartial<Values, TPrimitive> | undefined)[]
                : Type extends Promise<infer Value>
                  ? Promise<DeepPartial<Value, TPrimitive>>
                  : Type extends object
                    ? {
                        [Key in keyof Type]?: DeepPartial<Type[Key], TPrimitive>;
                      }
                    : IsUnknown<Type> extends true
                      ? unknown
                      : Partial<Type>;
