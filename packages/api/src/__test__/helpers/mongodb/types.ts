/**
 * Types copied from package 'ts-essentials'
 * Added ObjectId from 'mongodb' as Primitive
 *
 */
import { ObjectId } from 'mongodb';

export type Primitive =
  | ObjectId
  | string
  | number
  | boolean
  | bigint
  | symbol
  | undefined
  | null;

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

export type DeepPartial<Type> = Type extends Exclude<Builtin, Error>
  ? Type
  : Type extends Map<infer Keys, infer Values>
    ? Map<DeepPartial<Keys>, DeepPartial<Values>>
    : Type extends ReadonlyMap<infer Keys, infer Values>
      ? ReadonlyMap<DeepPartial<Keys>, DeepPartial<Values>>
      : Type extends WeakMap<infer Keys, infer Values>
        ? WeakMap<DeepPartial<Keys>, DeepPartial<Values>>
        : Type extends Set<infer Values>
          ? Set<DeepPartial<Values>>
          : Type extends ReadonlySet<infer Values>
            ? ReadonlySet<DeepPartial<Values>>
            : Type extends WeakSet<infer Values>
              ? WeakSet<DeepPartial<Values>>
              : Type extends readonly (infer Values)[]
                ? Type extends IsTuple<Type>
                  ? {
                      [Key in keyof Type]?: DeepPartial<Type[Key]>;
                    }
                  : Type extends Values[]
                    ? (DeepPartial<Values> | undefined)[]
                    : readonly (DeepPartial<Values> | undefined)[]
                : Type extends Promise<infer Value>
                  ? Promise<DeepPartial<Value>>
                  : Type extends object
                    ? {
                        [Key in keyof Type]?: DeepPartial<Type[Key]>;
                      }
                    : IsUnknown<Type> extends true
                      ? unknown
                      : Partial<Type>;
