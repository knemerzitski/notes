import { AggregateOptions, ObjectId, Document } from 'mongodb';

import { Emitter, mitt } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../context';
import { LoaderEvents } from '../loaders';
import { mapQueryAggregateResult } from '../query/map-query-aggregate-result';
import { MergedQueryDeep, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { MongoQueryFn, PartialQueryResultDeep, QueryDeep } from '../query/query';

import { QueryableUser, queryableUserDescription } from '../descriptions/user';

import {
  CreateQueryFnOptions,
  LoadOptions,
  PrimeOptions,
  QueryLoader,
  QueryLoaderContext,
  QueryLoaderError,
  QueryLoaderEvents,
  QueryLoaderKey,
  SessionOptions,
} from './query-loader';
import { isDefined } from '~utils/type-guards/is-defined';
import { groupBy } from '~utils/array/group-by';
import { getEqualObjectString } from './utils/get-equal-object-string';
import { Infer, InferRaw } from 'superstruct';

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

export type QueryableUserLoaderKey = QueryLoaderKey<
  QueryableUserId,
  InferRaw<typeof QueryableUser>,
  QueryableUserLoadContext
>['cache'];

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

export class UserNotFoundQueryLoaderError extends QueryLoaderError<
  QueryableUserId,
  InferRaw<typeof QueryableUser>
> {
  override readonly key: QueryableUserLoaderKey;

  constructor(key: QueryableUserLoaderKey) {
    super('User not found', key);
    this.key = key;
  }
}

export class QueryableUserLoader {
  private readonly loader: QueryLoader<
    QueryableUserId,
    typeof QueryableUser,
    GlobalContext,
    RequestContext
  >;

  constructor(params: Readonly<QueryableUserLoaderParams>) {
    const loaderEventBus =
      mitt<QueryLoaderEvents<QueryableUserId, typeof QueryableUser>>();
    if (params.eventBus) {
      loaderEventBus.on('loaded', (payload) => {
        params.eventBus?.emit('loadedUser', payload);
      });
    }

    loaderEventBus.on('loaded', (payload) => {
      this.primeEquivalentOtherId(payload);
    });

    this.loader = new QueryLoader({
      eventBus: params.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => {
        return queryableUserBatchLoad(keys, context);
      },
      context: params.context,
      struct: QueryableUser,
    });
  }

  prime(
    ...args: Parameters<typeof this.loader.prime>
  ): ReturnType<typeof this.loader.prime> {
    this.loader.prime(...args);
  }

  load<
    V extends QueryDeep<Infer<typeof QueryableUser>>,
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

  createQueryFn(
    id: QueryableUserId,
    options?: SessionOptions<CreateQueryFnOptions<RequestContext, typeof QueryableUser>>
  ): MongoQueryFn<typeof QueryableUser> {
    return this.loader.createQueryFn(id, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }

  private primeEquivalentOtherId(
    { key, value }: LoaderEvents['loadedUser'],
    options?: PrimeOptions
  ) {
    const result = value.result;
    if ('userId' in key.id) {
      if (result.thirdParty?.google?.id != null) {
        const googleUserId = result.thirdParty.google.id;
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
    } else if (result._id != null) {
      const userId = result._id;
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

interface BatchLoadIdProcessor<T> {
  getIds(): T[];
  addIdToQuery(query: QueryDeep<InferRaw<typeof QueryableUser>>): void;
  getMatchStage(): Document | undefined;
  addResult(result: Document): void;
  getResultById(id: QueryableUserId): Document | undefined;
}

class UserIdProcessor implements BatchLoadIdProcessor<ObjectId> {
  private readonly ids: Set<ObjectId>;
  private readonly resultById: Record<string, Document> = {};

  constructor(keys: readonly QueryableUserLoaderKey[]) {
    this.ids = new Set(
      keys
        .map((key) => ('userId' in key.id ? key.id.userId : undefined))
        .filter(isDefined)
    );
  }

  getIds(): ObjectId[] {
    return [...this.ids];
  }

  addIdToQuery(query: QueryDeep<InferRaw<typeof QueryableUser>>): void {
    if (this.ids.size === 0) return;
    query._id = 1;
  }

  getMatchStage(): Document | undefined {
    if (this.ids.size === 0) return;
    return {
      _id: {
        $in: this.getIds(),
      },
    };
  }

  addResult(result: Document): void {
    if (this.ids.size === 0) return;

    const userId = result._id;
    if (!(userId instanceof ObjectId)) {
      throw new Error('Expected User._id to be defined');
    }

    this.resultById[userId.toString()] = result;
  }

  getResultById(id: QueryableUserId): Document | undefined {
    if (!('userId' in id)) return;
    return this.resultById[id.userId.toString()];
  }
}

class GoogleUserIdProcessor implements BatchLoadIdProcessor<string> {
  private readonly ids: Set<string>;
  private readonly resultById: Record<string, Document> = {};

  constructor(keys: readonly QueryableUserLoaderKey[]) {
    this.ids = new Set(
      keys
        .map((key) => ('googleUserId' in key.id ? key.id.googleUserId : undefined))
        .filter(isDefined)
    );
  }

  getIds(): string[] {
    return [...this.ids];
  }

  addIdToQuery(query: QueryDeep<InferRaw<typeof QueryableUser>>): void {
    if (this.ids.size === 0) return;

    query.thirdParty = {
      ...query.thirdParty,
      google: {
        ...query.thirdParty?.google,
        id: 1,
      },
    };
  }

  getMatchStage(): Document | undefined {
    if (this.ids.size === 0) return;
    return {
      'thirdParty.google.id': {
        $in: this.getIds(),
      },
    };
  }

  addResult(result: Document): void {
    if (this.ids.size === 0) return;

    const googleUserId = result.thirdParty?.google?.id;
    if (typeof googleUserId !== 'string') {
      throw new Error('Expected User.thirdParty.google.id to be string');
    }

    this.resultById[googleUserId] = result;
  }

  getResultById(id: QueryableUserId): Document | undefined {
    if (!('googleUserId' in id)) return;
    return this.resultById[id.googleUserId];
  }
}

export async function queryableUserBatchLoad(
  keys: readonly QueryableUserLoaderKey[],
  context: QueryableUserLoadContext
): Promise<(PartialQueryResultDeep<InferRaw<typeof QueryableUser>> | Error)[]> {
  const idProcessors: BatchLoadIdProcessor<unknown>[] = [
    new UserIdProcessor(keys),
    new GoogleUserIdProcessor(keys),
  ];

  const idQuery: QueryDeep<InferRaw<typeof QueryableUser>> = {};
  idProcessors.forEach((p) => {
    p.addIdToQuery(idQuery);
  });

  // Merge queries
  const mergedQuery = mergeQueries([...keys.map((key) => key.query), idQuery]);

  // Build aggregate pipeline
  const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
    description: queryableUserDescription,
    customContext: context.global,
  });

  // Fetch from database
  const usersResults = await context.global.collections.users
    .aggregate(
      [
        {
          $match: {
            $or: idProcessors.map((p) => p.getMatchStage()).filter(isDefined),
          },
        },
        ...aggregatePipeline,
      ],
      {
        session: context.request,
      }
    )
    .toArray();

  for (const userResult of usersResults) {
    idProcessors.forEach((p) => {
      p.addResult(userResult);
    });
  }

  return keys.map((key) => {
    for (const processor of idProcessors) {
      const result = processor.getResultById(key.id);
      if (result) {
        return mapQueryAggregateResult(key.query, mergedQuery, result, {
          descriptions: [queryableUserDescription],
        });
      }
    }

    return new UserNotFoundQueryLoaderError(key);
  });
}

// @ts-expect-error Keep function for backup
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function queryableUserBatchLoadSeparatePerId(
  keys: readonly QueryableUserLoaderKey[],
  context: QueryableUserLoadContext
): Promise<(PartialQueryResultDeep<InferRaw<typeof QueryableUser>> | Error | null)[]> {
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
      mergedQuery: MergedQueryDeep<InferRaw<typeof QueryableUser>>;
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
