/* eslint-disable @typescript-eslint/no-explicit-any */
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { QueryDeep } from '../query';
import { isMongoPrimitive } from './is-mongo-primitive';
import { PickByPath } from '~utils/types';
import { mergedObjects } from '~utils/object/merge-objects';
import { Struct } from 'superstruct';

export type VisitorFn<T> = (ctx: {
  addPermutationsByPath: PermutationsByPathFn<T>;
  mergeByPath: MergeByPathFn<T>;
}) => void;

export type PermutationsByPathFn<T> = <S extends string>(
  path: S,
  permutationObjects: QueryDeep<PickByPath<T, S>>[]
) => void;

export type MergeByPathFn<T> = <S extends string>(
  path: S,
  mergeObject: QueryDeep<PickByPath<T, S>>
) => void;

function* getEntries<T extends object>(
  value: T,
  struct?: Struct<T>
): Iterable<[string | number, unknown, Struct<any> | Struct<never> | null]> {
  if (struct) {
    yield* struct.entries(value, {
      branch: [],
      path: [],
    });
    return;
  }

  for (const [subKey, subValue] of Object.entries(value)) {
    yield [subKey, subValue, null];
  }
}

export function valueToQueries<T, S = T>(
  value: T,
  options?: { visitorFn?: VisitorFn<T>; fillStruct?: Struct<S> },
  ctx?: { path?: string }
): QueryDeep<T>[] {
  const path = ctx?.path ?? '';
  const visitorFn: VisitorFn<any> | undefined = options?.visitorFn;

  if (isMongoPrimitive(value)) {
    return [1 as any];
  }

  if (isObjectLike(value)) {
    let results: Record<string, unknown>[] = [{}];

    if (visitorFn) {
      const addPermutationsByPath: PermutationsByPathFn<T> = (condPath, variants) => {
        if (isPath(path, condPath)) {
          results = variants.flatMap((variant) =>
            results.map((result) => mergedObjects(result, variant) as any)
          );
        }
      };
      const mergeByPath: MergeByPathFn<T> = (condPath, mergeValue) => {
        if (isPath(path, condPath)) {
          results = results.map((result) => mergedObjects(result, mergeValue)) as any[];
        }
      };
      visitorFn({
        mergeByPath,
        addPermutationsByPath,
      });
    }

    const isArray = Array.isArray(value);

    for (const entry of getEntries(value, options?.fillStruct as any)) {
      const subKey = entry[0];
      let subValue = entry[1];
      const subStruct = entry[2];

      if (subValue === undefined && subStruct) {
        if (['record'].includes(subStruct.type)) {
          continue;
        } else if (['object'].includes(subStruct.type)) {
          subValue = {};
        } else if (['array'].includes(subStruct.type)) {
          subValue = [{}];
        }
      }

      const subQueries = valueToQueries(
        subValue,
        {
          ...options,
          fillStruct: subStruct,
        } as any,
        {
          path: getPath(path, String(subKey)),
        }
      );

      if (isArray) {
        results = subQueries.flatMap((subQuery) =>
          results.map((result) => mergedObjects(subQuery, result) as any)
        );
      } else {
        results = subQueries.flatMap((subQuery) =>
          results.map((result) => ({
            ...result,
            [subKey]: mergedObjects(subQuery, result[subKey]),
          }))
        );
      }
    }

    return results as any[];
  }

  return [];
}

function isPath(path: string, condPath: string) {
  if (!condPath.includes('*')) {
    return path === condPath;
  }

  const a = path.split('.');
  const b = condPath.split('.');
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (b[i] === '*') {
      continue;
    }

    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

function getPath(...parts: string[]) {
  return parts.filter((part) => part.trim().length > 0).join('.');
}

export function valueToQuery<T>(value: T): QueryDeep<T> {
  return valueToQueries(value)[0] as any;
}
