import { AggregateOptions } from 'mongodb';

import { groupBy } from '~utils/array/group-by';
import { Emitter, mitt } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../context';
import { LoaderEvents } from '../loaders';
import { mapQueryAggregateResult } from '../query/map-query-aggregate-result';
import { MergedQueryDeep, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { PartialQueryResultDeep, QueryDeep } from '../query/query';

import {
  LoadOptions,
  QueryLoader,
  QueryLoaderContext,
  QueryLoaderError,
  QueryLoaderEvents,
  QueryLoaderKey,
  SessionOptions,
} from '../query/query-loader';
import { QueryableSession, queryableSessionDescription } from '../descriptions/session';
import { Infer, InferRaw } from 'superstruct';

export interface QueryableSessionId {
  /**
   * Session.cookieId
   */
  cookieId: string;
}

export type QueryableSessionLoaderKey = QueryLoaderKey<
  QueryableSessionId,
  InferRaw<typeof QueryableSession>,
  QueryableSessionLoadContext
>['cache'];

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

export class SessionNotFoundQueryLoaderError extends QueryLoaderError<
  QueryableSessionId,
  InferRaw<typeof QueryableSession>
> {
  override readonly key: QueryableSessionLoaderKey;

  constructor(key: QueryableSessionLoaderKey) {
    super('Session not found', key);
    this.key = key;
  }
}

export class QueryableSessionLoader {
  private readonly loader: QueryLoader<
    QueryableSessionId,
    typeof QueryableSession,
    GlobalContext,
    RequestContext
  >;

  readonly context: GlobalContext;

  constructor(params: Readonly<QueryableSessionLoaderParams>) {
    this.context = params.context;

    const loaderEventBus =
      mitt<QueryLoaderEvents<QueryableSessionId, typeof QueryableSession>>();
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
      struct: QueryableSession,
    });
  }

  prime(
    ...args: Parameters<typeof this.loader.prime>
  ): ReturnType<typeof this.loader.prime> {
    this.loader.prime(...args);
  }

  load<
    V extends QueryDeep<Infer<typeof QueryableSession>>,
    T extends 'any' | 'raw' | 'validated' = 'any',
  >(
    key: Parameters<typeof this.loader.load<V, T>>[0],
    options?: SessionOptions<LoadOptions<RequestContext, T>>
  ): ReturnType<typeof this.loader.load<V, T>> {
    return this.loader.load(key, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
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
