import { isObjectLike } from '~utils/type-guards/is-object-like';
import { getOrCreateObject } from '~utils/object/got-or-create-object';
import { getOrCreateArray } from '~utils/array/got-or-create-array';
import { MongoPrimitive } from '../types';
import {
  ObjectQueryDeep,
  FieldInclusion,
  QUERY_ARG_PREFIX,
  QueryArgPrefix,
} from './query';
import mapObject, { mapObjectSkip } from 'map-obj';
import { getEqualObjectString } from '../loaders/utils/get-equal-object-string';
import { PickStartsWith, OmitStartsWith } from '~utils/types';

export const ARGS_FIELD = '$args';
type ArgsField = typeof ARGS_FIELD;

export type MergedQueryDeep<T> = T extends (infer U)[]
  ? MergedQueryDeep<U> & MaybeArgs<T>
  : T extends MongoPrimitive
    ? FieldInclusion
    : T extends object
      ? MergedObjectQueryDeep<T>
      : T;

export type MergedObjectQueryDeep<T extends object> = OmitStartsWith<
  {
    [Key in keyof T]?: MergedQueryDeep<T[Key]>;
  },
  QueryArgPrefix
> &
  MaybeArgs<T>;

type MaybeArgs<T extends object> = keyof PickStartsWith<T, QueryArgPrefix> extends never
  ? unknown
  : { [Key in ArgsField]?: PickStartsWith<T, QueryArgPrefix>[] };

export function isMergedQueryArgField(key: string) {
  return key === ARGS_FIELD;
}

export function isQueryArgField(key: string) {
  return key.startsWith(QUERY_ARG_PREFIX);
}

export function mergeQueries<T extends object>(
  queries: readonly ObjectQueryDeep<T>[],
  context?: {
    mergedQuery: MergedObjectQueryDeep<T>;
    path: string;
    argsByPath: Record<string, Set<string>>;
  }
): MergedObjectQueryDeep<T> {
  const mergedQuery: Record<string, unknown> = context?.mergedQuery ?? {};
  const argsByPath = context?.argsByPath ?? {};
  const path = context?.path ?? 'ROOT';

  for (const query of queries) {
    // Extract args by $ prefix
    const argsObj = mapObject(query, (key, value) => {
      if (typeof key !== 'string' || !isQueryArgField(key)) return mapObjectSkip;
      return [key, value];
    });
    if (Object.keys(argsObj).length > 0) {
      const argsKey = getEqualObjectString(argsObj);

      // Add arg and cache to prevent duplicates
      const existingArgsSet = argsByPath[path];
      if (!existingArgsSet) {
        argsByPath[path] = new Set([argsKey]);
        getOrCreateArray(mergedQuery, ARGS_FIELD).push(argsObj);
      } else if (!existingArgsSet.has(argsKey)) {
        existingArgsSet.add(argsKey);
        getOrCreateArray(mergedQuery, ARGS_FIELD).push(argsObj);
      }
    }

    for (const queryKey of Object.keys(query)) {
      if (isQueryArgField(queryKey)) continue;

      const queryValue = query[queryKey as keyof typeof query];

      // Merged 1's from all sources
      if (queryValue === 1) {
        mergedQuery[queryKey] = 1;
      } else if (isObjectLike(queryValue)) {
        mergeQueries([queryValue as ObjectQueryDeep<T>], {
          mergedQuery: getOrCreateObject(
            mergedQuery,
            queryKey
          ) as MergedObjectQueryDeep<T>,
          argsByPath,
          path: `${path}.${queryKey}`,
        });
      } else {
        // Fallback replace value
        mergedQuery[queryKey] = queryValue;
      }
    }
  }

  return mergedQuery as MergedObjectQueryDeep<T>;
}
