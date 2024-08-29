import { FieldWrapper } from '../../../graphql/domains/types.generated';

export type UnwrapFieldWrapper<T> = T extends FieldWrapper<infer F>
  ? F extends (infer FU)[]
    ? UnwrapFieldWrapper<FU>[]
    : F extends object
      ? UnwrapFieldWrapperObject<F>
      : F
  : T extends (infer U)[]
    ? UnwrapFieldWrapper<U>[]
    : T extends object
      ? UnwrapFieldWrapperObject<T>
      : T;

export type UnwrapFieldWrapperObject<T extends object> = {
  [Key in keyof T]-?: UnwrapFieldWrapper<T[Key]>;
};
