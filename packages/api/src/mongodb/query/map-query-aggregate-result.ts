import { isDefined } from '~utils/type-guards/is-defined';

import { isObjectLike } from '~utils/type-guards/is-object-like';

import { DeepAnyDescription, FieldDescription } from './description';
import { MergedDeepQuery } from './merge-queries';
import { DeepQuery, DeepQueryResult } from './query';

export type MapAggregateResultResolver<TSchema = unknown, TResult = unknown> = (args: {
  query: DeepQuery<TSchema>;
  mergedQuery: MergedDeepQuery<TSchema>;
  result: TResult;
}) => unknown;

interface MapQueryAggregateResultContext<
  TSchema = unknown,
  TResult = unknown,
  TContext = unknown,
> {
  descriptions?: DeepAnyDescription<TSchema, TResult, TContext>[];
}

export function mapQueryAggregateResult<
  TSchema = unknown,
  TResult = unknown,
  TContext = unknown,
>(
  rootQuery: DeepQuery<TSchema>,
  rootMergedQuery: MergedDeepQuery<TSchema>,
  aggregateResult: unknown,
  context?: MapQueryAggregateResultContext<TSchema, TResult, TContext>
): DeepQueryResult<TSchema> {
  if (aggregateResult == null) return aggregateResult as DeepQueryResult<TSchema>;

  const descriptions = context?.descriptions ?? [];
  if (descriptions.length === 0) {
    return aggregateResult as DeepQueryResult<TSchema>;
  }

  const resolvers = descriptions
    .map((desc) => desc.$mapAggregateResult)
    .filter(isDefined);

  aggregateResult = resolvers.reduce(
    (mappedResultValue, resolver) =>
      resolver({
        query: rootQuery,
        mergedQuery: rootMergedQuery,
        result: mappedResultValue as TResult,
      }) ?? mappedResultValue,
    aggregateResult
  ) as DeepQueryResult<TSchema>;

  if (
    isObjectLike(rootQuery) &&
    aggregateResult != null &&
    typeof aggregateResult === 'object'
  ) {
    if (Array.isArray(aggregateResult)) {
      const descriptionsNoResolver = descriptions.map(
        ({ $mapAggregateResult, ...rest }) => rest
      ) as DeepAnyDescription<unknown>[];

      return aggregateResult.map((subAggregateResult) =>
        mapQueryAggregateResult(rootQuery, rootMergedQuery, subAggregateResult, {
          // @ts-expect-error Ignore typing for dynamic object
          descriptions: descriptionsNoResolver,
        })
      ) as DeepQueryResult<TSchema>;
    } else {
      const newAggregateResult: Record<string, unknown> = {};

      for (const subQueryKey of Object.keys(rootQuery)) {
        const subQuery = rootQuery[subQueryKey as keyof typeof rootQuery];
        if (subQuery == null) {
          continue;
        }
        const subMergedQuery =
          rootMergedQuery[subQueryKey as keyof typeof rootMergedQuery];
        if (subMergedQuery == null) {
          continue;
        }

        let subAggregateResult = (aggregateResult as Record<string, unknown>)[
          subQueryKey
        ];
        if (subAggregateResult == null) {
          continue;
        }

        const subDescriptions = descriptions
          .map((desc) => desc[subQueryKey as keyof typeof desc])
          .filter(isDefined);

        const subDescriptions_noAnyKey = subDescriptions
          .map((subDesc) => {
            const { $anyKey, ...rest } = subDesc as FieldDescription;
            return rest;
          })
          .filter((subDesc) => Object.keys(subDesc).length > 0);

        const anyKeySplitDescriptions = subDescriptions
          .map((subDesc) => (subDesc as FieldDescription).$anyKey)
          .filter(isDefined)
          .flatMap((anyKeySubDesc) =>
            Object.keys(subQuery).map((sub2QueryKey) => ({
              [sub2QueryKey]: anyKeySubDesc,
            }))
          );

        subAggregateResult = mapQueryAggregateResult(
          subQuery,
          subMergedQuery,
          subAggregateResult,
          {
            descriptions: [...anyKeySplitDescriptions, ...subDescriptions_noAnyKey],
          }
        );
        if (subAggregateResult != null) {
          newAggregateResult[subQueryKey] = subAggregateResult;
        }
      }

      aggregateResult = newAggregateResult;
    }
  }

  return aggregateResult as DeepQueryResult<TSchema>;
}