import mitt, { Emitter } from 'mitt';
import { AggregateOptions, ObjectId } from 'mongodb';

import { CollectionName, MongoDBCollections } from '../../collections';
import { MongoDBContext } from '../../context';
import { LoaderEvents } from '../../loaders';
import { MongoQueryFn, QueryDeep } from '../../query/query';

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
} from '../../query/query-loader';

import { batchLoad } from './batch-load';
import { QueryableUser } from './description';

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
  QueryableUser,
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
    | CollectionName.USERS
    | CollectionName.NOTES
    | CollectionName.OPEN_NOTES
    | CollectionName.COLLAB_RECORDS
  >;
}

type RequestContext = AggregateOptions['session'];

export class UserNotFoundQueryLoaderError extends QueryLoaderError<
  QueryableUserId,
  QueryableUser
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
        return batchLoad(keys, context);
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

  load<V extends QueryDeep<QueryableUser>>(
    key: Parameters<typeof this.loader.load<V>>[0],
    options?: SessionOptions<LoadOptions<RequestContext>>
  ): ReturnType<typeof this.loader.load<V>> {
    return this.loader.load(key, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }

  createQueryFn(
    id: QueryableUserId,
    options?: SessionOptions<CreateQueryFnOptions<RequestContext, QueryableUser>>
  ): MongoQueryFn<QueryableUser> {
    return this.loader.createQueryFn(id, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }

  private primeEquivalentOtherId(
    { key, value }: LoaderEvents['loadedUser'],
    options?: PrimeOptions<QueryableUser>
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
