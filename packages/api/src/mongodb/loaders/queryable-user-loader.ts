import { AggregateOptions, ObjectId } from 'mongodb';

import { groupBy } from '~utils/array/group-by';
import { Emitter, mitt } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';
import { mapQueryAggregateResult } from '../query/map-query-aggregate-result';
import { MergedDeepObjectQuery, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { DeepQueryResult } from '../query/query';

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

export interface QueryableUserId {
  /**
   * User._id
   */
  userId: ObjectId;
}

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
    value: DeepQueryResult<QueryableUser>,
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
): Promise<(DeepQueryResult<QueryableUser> | Error | null)[]> {
  const keysByUserId = groupBy(keys, (key) => key.id.userId.toHexString());

  const results = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserLoadKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Merge queries
        const mergedQuery = mergeQueries(sameUserLoadKeys.map(({ query }) => query));

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
                  _id: userId,
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
          userIdStr,
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
      mergedQuery: MergedDeepObjectQuery<QueryableUser>;
    }
  >;

  return keys.map((key) => {
    const result = results[key.id.userId.toHexString()];
    if (!result?.user) return null;

    return mapQueryAggregateResult(key.query, result.mergedQuery, result.user, {
      descriptions: [queryableUserDescription],
    });
  });
}
