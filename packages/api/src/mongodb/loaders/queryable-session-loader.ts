import { AggregateOptions } from 'mongodb';

import { groupBy } from '~utils/array/group-by';
import { Emitter, mitt } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../context';
import { LoaderEvents } from '../loaders';
import { mapQueryAggregateResult } from '../query/map-query-aggregate-result';
import { MergedObjectQueryDeep, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { QueryResultDeep } from '../query/query';

import {
  PrimeOptions,
  QueryLoader,
  QueryLoaderCacheKey,
  QueryLoaderContext,
  QueryLoaderEvents,
} from './query-loader';
import {
  QueryableSession,
  queryableSessionDescription,
} from '../schema/session/query/queryable-session';

export interface QueryableSessionId {
  /**
   * Session.cookieId
   */
  cookieId: string;
}

export type QueryableSessionLoaderKey = QueryLoaderCacheKey<
  QueryableSessionId,
  QueryableSession
>;

export interface QueryableSessionLoaderParams {
  eventBus?: Emitter<LoaderEvents>;
  context: GlobalContext;
}

export type QueryableSessionLoadContext = QueryLoaderContext<
  GlobalContext,
  RequestContext
>;

interface GlobalContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.SESSIONS
  >;
}

type RequestContext = AggregateOptions['session'];

export class QueryableSessionLoader {
  private readonly loader: QueryLoader<
    QueryableSessionId,
    QueryableSession,
    GlobalContext,
    RequestContext
  >;

  readonly context: GlobalContext;

  constructor(params: Readonly<QueryableSessionLoaderParams>) {
    this.context = params.context;

    const loaderEventBus =
      mitt<QueryLoaderEvents<QueryableSessionId, QueryableSession>>();
    if (params.eventBus) {
      loaderEventBus.on('loaded', (payload) => {
        params.eventBus?.emit('loadedSession', payload);
      });
    }

    this.loader = new QueryLoader({
      eventBus: params.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => {
        return queryableSessionBatchLoad(keys, context);
      },
      context: params.context,
    });
  }

  prime(
    key: QueryableSessionLoaderKey,
    value: QueryResultDeep<QueryableSession>,
    options?: PrimeOptions
  ) {
    this.loader.prime(key, value, options);
  }

  async load(key: QueryableSessionLoaderKey, session?: RequestContext) {
    return this.loader.load(key, {
      context: session,
      skipCache: session != null,
    });
  }
}

export interface QueryableSessionBatchLoadContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.SESSIONS
  >;
}

export async function queryableSessionBatchLoad(
  keys: readonly QueryableSessionLoaderKey[],
  context: QueryableSessionLoadContext
): Promise<(QueryResultDeep<QueryableSession> | Error | null)[]> {
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
      mergedQuery: MergedObjectQueryDeep<QueryableSession>;
    }
  >;

  return keys.map((key) => {
    const result = results[key.id.cookieId];
    if (!result?.session) return null;

    return mapQueryAggregateResult(key.query, result.mergedQuery, result.session, {
      descriptions: [queryableSessionDescription],
    });
  });
}
