import { AggregateOptions, ObjectId } from 'mongodb';

import { groupBy } from '~utils/array/group-by';
import { Emitter, mitt } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';
import { mapQueryAggregateResult } from '../query/map-query-aggregate-result';
import { MergedObjectQueryDeep, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { QueryResultDeep } from '../query/query';

import {
  QueryableUser,
  queryableUserDescription,
} from '../schema/user/query/queryable-user';

import {
  PrimeOptions,
  QueryLoader,
  QueryLoaderCacheKey,
  QueryLoaderContext,
  QueryLoaderEvents,
} from './query-loader';
import { getEqualObjectString } from './utils/get-equal-object-string';

export type QueryableUserId =
  | {
      /**
       * User._id
       */
      userId: ObjectId;
    }
  | {
      googleUserId: string;
    };

export type QueryableUserLoaderKey = QueryLoaderCacheKey<QueryableUserId, QueryableUser>;

export interface QueryableUserLoaderParams {
  eventBus?: Emitter<LoaderEvents>;
  context: GlobalContext;
}

export type QueryableUserLoadContext = QueryLoaderContext<GlobalContext, RequestContext>;

interface GlobalContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.USERS | CollectionName.NOTES
  >;
}

type RequestContext = AggregateOptions['session'];

export class QueryableUserLoader {
  private readonly loader: QueryLoader<
    QueryableUserId,
    QueryableUser,
    GlobalContext,
    RequestContext
  >;

  constructor(params: Readonly<QueryableUserLoaderParams>) {
    const loaderEventBus = mitt<QueryLoaderEvents<QueryableUserId, QueryableUser>>();
    if (params.eventBus) {
      loaderEventBus.on('loaded', (payload) => {
        params.eventBus?.emit('loadedUser', payload);
      });
    }

    loaderEventBus.on('loaded', (payload) => {
      this.primeEquivalentOtherId(payload, { skipEmitEvent: true });
    });

    this.loader = new QueryLoader({
      eventBus: params.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => {
        return queryableUserBatchLoad(keys, context);
      },
      context: params.context,
    });
  }

  prime(
    key: QueryableUserLoaderKey,
    value: QueryResultDeep<QueryableUser>,
    options?: PrimeOptions
  ) {
    this.loader.prime(key, value, options);
  }

  async load(key: QueryableUserLoaderKey, session?: RequestContext) {
    return this.loader.load(key, {
      context: session,
      skipCache: session != null,
    });
  }

  private primeEquivalentOtherId(
    { key, value }: LoaderEvents['loadedUser'],
    options?: PrimeOptions
  ) {
    if ('userId' in key.id) {
      if (value.thirdParty?.google?.id != null) {
        const googleUserId = value.thirdParty.google.id;
        this.loader.prime(
          {
            id: {
              googleUserId: googleUserId,
            },
            query: key.query,
          },
          value,
          options
        );
      }
    } else if (value._id != null) {
      const userId = value._id;
      this.loader.prime(
        {
          id: {
            userId,
          },
          query: key.query,
        },
        value,
        options
      );
    }
  }
}

export interface QueryableUserBatchLoadContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.USERS | CollectionName.NOTES
  >;
}

export async function queryableUserBatchLoad(
  keys: readonly QueryableUserLoaderKey[],
  context: QueryableUserLoadContext
): Promise<(QueryResultDeep<QueryableUser> | Error | null)[]> {
  const queriesById = groupBy(keys, (key) => getEqualObjectString(key.id));

  const results = Object.fromEntries(
    await Promise.all(
      Object.entries(queriesById).map(async ([idStr, sameIdLoadKeys]) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstId = sameIdLoadKeys[0]!.id;

        // Merge queries
        const mergedQuery = mergeQueries(sameIdLoadKeys.map(({ query }) => query));

        // Build aggregate pipeline
        const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
          description: queryableUserDescription,
          customContext: context.global,
        });

        // Fetch from database
        const userResult = await context.global.collections.users
          .aggregate(
            [
              {
                $match: {
                  ...('userId' in firstId
                    ? { _id: firstId.userId }
                    : {
                        'thirdParty.google.id': firstId.googleUserId,
                      }),
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
          idStr,
          {
            user: userResult[0],
            mergedQuery,
          },
        ];
      })
    )
  ) as Record<
    string,
    {
      user: Document | undefined;
      mergedQuery: MergedObjectQueryDeep<QueryableUser>;
    }
  >;

  return keys.map((key) => {
    const result = results[getEqualObjectString(key.id)];
    if (!result?.user) return null;

    return mapQueryAggregateResult(key.query, result.mergedQuery, result.user, {
      descriptions: [queryableUserDescription],
    });
  });
}
