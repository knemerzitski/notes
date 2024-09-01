/* eslint-disable @typescript-eslint/no-explicit-any */
import { object, Struct, type } from 'superstruct';
import { ObjectSchema, ObjectType } from 'superstruct/dist/utils';
import { ReplaceWith } from '../types';

/**
 * Merges {@link struct} schema with {@link overwriteStruct} schema.
 *
 */
export function merge<S extends ObjectSchema, R extends ObjectSchema>(
  struct: Struct<ObjectType<S>, S>,
  overwriteStruct: Struct<ObjectType<R>, R>
): Struct<ObjectType<ReplaceWith<S, R>>, ReplaceWith<S, R>> {
  const { schema } = struct;
  const resultSchema: any = { ...schema };

  for (const key of Object.keys(overwriteStruct.schema)) {
    resultSchema[key] = overwriteStruct.schema[key];
  }

  switch (struct.type) {
    case 'type':
      return type(resultSchema as ReplaceWith<S, R>);
    default:
      return object(resultSchema as ReplaceWith<S, R>);
  }
}
