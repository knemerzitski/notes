import { InferRaw } from 'superstruct';
import { groupBy } from '~utils/array/group-by';
import { mapQueryAggregateResult } from '../../query/map-query-aggregate-result';
import { mergeQueries, MergedQueryDeep } from '../../query/merge-queries';
import { mergedQueryToPipeline } from '../../query/merged-query-to-pipeline';
import { PartialQueryResultDeep } from '../../query/query';
import { QueryableSession, queryableSessionDescription } from './description';
import {
  QueryableSessionLoaderKey,
  QueryableSessionLoadContext,
  SessionNotFoundQueryLoaderError,
} from './loader';

export async function batchLoad(
  keys: readonly QueryableSessionLoaderKey[],
  context: QueryableSessionLoadContext
): Promise<(PartialQueryResultDeep<InferRaw<typeof QueryableSession>> | Error)[]> {
  const keysByCookieId = groupBy(keys, (key) => key.id.cookieId);

  const results = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByCookieId).map(async ([cookieId, sameCookieLoadKeys]) => {
        // Merge queries
        const mergedQuery = mergeQueries(sameCookieLoadKeys.map(({ query }) => query));

        // Build aggregate pipeline
        const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
          description: queryableSessionDescription,
          customContext: context.global,
        });

        // Fetch from database
        const sessionResult = await context.global.collections.sessions
          .aggregate(
            [
              {
                $match: {
                  cookieId,
                },
              },
              ...aggregatePipeline,
            ],
            {
              session: context.request,
            }
          )
          .toArray();

        return [
          cookieId,
          {
            session: sessionResult[0],
            mergedQuery,
          },
        ];
      })
    )
  ) as Record<
    string,
    {
      session: Document | undefined;
      mergedQuery: MergedQueryDeep<InferRaw<typeof QueryableSession>>;
    }
  >;

  return keys.map((key) => {
    const result = results[key.id.cookieId];
    if (!result?.session) {
      return new SessionNotFoundQueryLoaderError(key);
    }

    return mapQueryAggregateResult(key.query, result.mergedQuery, result.session, {
      descriptions: [queryableSessionDescription],
    });
  });
}
