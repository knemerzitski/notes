/* eslint-disable @typescript-eslint/no-explicit-any */
import { isObjectLike } from '~utils/type-guards/is-object-like';
import { QueryDeep } from '../query';
import { isMongoPrimitive } from './is-mongo-primitive';
import { PickByPath } from '~utils/types';
import { mergedObjects } from '~utils/object/merge-objects';

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

export function valueToQueries<T>(
  value: T,
  options?: { visitorFn?: VisitorFn<T> },
  ctx?: { path?: string }
): QueryDeep<T>[] {
  const path = ctx?.path ?? '';
  const visitorFn: VisitorFn<any> | undefined = options?.visitorFn;

  if (isMongoPrimitive(value)) {
    return [1 as any];
  }

  if (Array.isArray(value)) {
    return mergedObjects(...value.map((v) => valueToQueries(v, options, ctx))) as any;
  }

  if (isObjectLike(value)) {
    let results: Record<string, unknown>[] = [{}];

    if (visitorFn) {
      const addPermutationsByPath: PermutationsByPathFn<T> = (condPath, variants) => {
        if (isPath(path, condPath)) {
          results = variants.flatMap((variant) =>
            results.map((result) => (variant === 1 ? result : { ...result, ...variant }))
          );
        }
      };
      const mergeByPath: MergeByPathFn<T> = (condPath, permutationObjects) => {
        if (isPath(path, condPath)) {
          results = results.map((result) => ({ ...result, ...permutationObjects }));
        }
      };
      visitorFn({
        mergeByPath,
        addPermutationsByPath,
      });
    }

    for (const [subKey, subValue] of Object.entries(value)) {
      const subQueries = valueToQueries(subValue, options as any, {
        path: getPath(path, subKey),
      });
      results = subQueries.flatMap((subQuery) =>
        results.map((result) => ({ ...result, [subKey]: subQuery }))
      );
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
