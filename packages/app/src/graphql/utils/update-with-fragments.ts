import { DefaultContext, ApolloCache, MutationUpdaterFunction } from '@apollo/client';

import { isObjectLike } from '../../../../utils/src/type-guards/is-object-like';

/**
 * Takes a mutation update function and and transforms it.
 * New function will call all fragment update functions.
 */
export function updateWithFragments<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TVariables = any,
  TContext = DefaultContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  rootUpdate:
    | MutationUpdaterFunction<NoInfer<TData>, NoInfer<TVariables>, TContext, TCache>
    | undefined,
  fragmentsInfo: readonly {
    path: readonly string[];
    /**
     * Required data typename to call update
     */
    __typename?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update?: MutationUpdaterFunction<any, NoInfer<TVariables>, TContext, TCache>;
  }[]
):
  | MutationUpdaterFunction<NoInfer<TData>, NoInfer<TVariables>, TContext, TCache>
  | undefined {
  const filteredUpdatesInPath = fragmentsInfo.filter(hasUpdate);

  if (filteredUpdatesInPath.length === 0) {
    return rootUpdate;
  }

  return (cache, result, options) => {
    const data = result.data;

    for (const { path, __typename, update } of filteredUpdatesInPath) {
      const subData = findByPath(data, path);

      // Sanity check, subData __typename matches expected in fragment
      if (
        __typename != null &&
        isObjectLike(subData) &&
        subData.__typename !== __typename
      ) {
        console.error(`Expected data to have typename "${__typename}"`, {
          data: subData,
        });
        continue;
      }

      update(
        cache,
        {
          ...result,
          data: subData,
        },
        options
      );
    }

    rootUpdate?.(cache, result, options);
  };
}

function hasUpdate<U, T extends { update?: U }>(
  value: T
): value is T & { update: NonNullable<U> } {
  return value.update != null;
}

function findByPath(obj: unknown, path: readonly string[]) {
  const key = path[0];
  if (!key) {
    return obj;
  }

  if (!isObjectLike(obj)) {
    return null;
  }

  return findByPath(obj[key], path.slice(1));
}
