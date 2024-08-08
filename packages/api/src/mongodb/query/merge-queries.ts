import { RelayPagination, getPaginationKey } from '../pagination/relay-array-pagination';
import { MongoPrimitive } from '../types';

import {
  Cursor,
  DeepArrayQuery,
  DeepObjectQuery,
  IdProjectionValue,
  ProjectionValue,
} from './query';

export type MergedDeepQuery<T> = T extends (infer U)[]
  ? MergedDeepArrayQuery<U>
  : T extends MongoPrimitive
    ? ProjectionValue
    : T extends object
      ? MergedDeepObjectQuery<T>
      : T;

export type MergedDeepObjectQuery<T extends object> = {
  [Key in keyof T]?: T[Key] extends MongoPrimitive
    ? Key extends '_id'
      ? IdProjectionValue
      : MergedDeepQuery<T[Key]>
    : MergedDeepQuery<T[Key]>;
};

export interface MergedDeepArrayQuery<TItem> {
  $query?: MergedDeepQuery<TItem>;
  $paginations?: RelayPagination<Cursor>[];
}

export function isMergedArrayQuery(
  value?: unknown
): value is MergedDeepArrayQuery<unknown> {
  const isObject = value != null && typeof value == 'object';
  if (!isObject) return false;

  const hasQuery =
    '$query' in value && value.$query != null && typeof value.$query === 'object';
  return hasQuery;
}

export function mergeQueries<T extends object>(
  mergedObj: MergedDeepObjectQuery<T>,
  sources: readonly DeepObjectQuery<T>[],
  context?: {
    path: string;
    paginationsByPath: Record<string, Set<string>>;
  }
): MergedDeepObjectQuery<T> {
  const resultMergedObj: Record<string, unknown> = mergedObj;
  const paginationsByPath = context?.paginationsByPath ?? {};
  const path = context?.path ?? 'ROOT';

  for (const source of sources) {
    for (const sourceKey of Object.keys(source)) {
      const sourceValue = source[sourceKey as keyof DeepObjectQuery<T>];

      if (sourceValue === 1) {
        // Merged 1's from all sources
        resultMergedObj[sourceKey] = 1;
      } else if (sourceValue != null && typeof sourceValue === 'object') {
        let mergedValue = resultMergedObj[sourceKey] as object | undefined;
        if (!mergedValue) {
          mergedValue = {};
          resultMergedObj[sourceKey] = mergedValue;
        }

        if ('$query' in sourceValue || '$pagination' in sourceValue) {
          const arraySourceValue = sourceValue as DeepArrayQuery<T>;
          const arrayMergedValue = mergedValue as MergedDeepArrayQuery<unknown>;

          if (arraySourceValue.$query) {
            if (!arrayMergedValue.$query) {
              arrayMergedValue.$query = {};
            }
            mergeQueries(
              arrayMergedValue.$query as MergedDeepObjectQuery<T>,
              [arraySourceValue.$query],
              { paginationsByPath: paginationsByPath, path: `${path}.${sourceKey}` }
            );
          }

          if (arraySourceValue.$pagination) {
            if (!arrayMergedValue.$paginations) {
              arrayMergedValue.$paginations = [];
            }

            const pagination = arraySourceValue.$pagination;

            // Filter out duplicate paginations
            const sourcePath = `${path}.${sourceKey}`;
            const paginationValue = getPaginationKey(pagination);
            const existingPaginationsSet = paginationsByPath[sourcePath];
            if (!existingPaginationsSet) {
              paginationsByPath[sourcePath] = new Set([paginationValue]);
              arrayMergedValue.$paginations.push(pagination);
            } else if (!existingPaginationsSet.has(paginationValue)) {
              existingPaginationsSet.add(paginationValue);
              arrayMergedValue.$paginations.push(pagination);
            }
          }
        } else {
          mergeQueries(mergedValue, [sourceValue], {
            paginationsByPath: paginationsByPath,
            path: `${path}.${sourceKey}`,
          });
        }
      } else {
        resultMergedObj[sourceKey] = sourceValue;
      }
    }
  }

  return resultMergedObj as MergedDeepObjectQuery<T>;
}
