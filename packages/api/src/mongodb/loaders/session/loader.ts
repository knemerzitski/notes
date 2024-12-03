import mitt, { Emitter } from 'mitt';
import { AggregateOptions } from 'mongodb';


import { Infer } from 'superstruct';

import { CollectionName, MongoDBCollections } from '../../collections';
import { MongoDBContext } from '../../context';
import { LoaderEvents } from '../../loaders';
import { QueryDeep } from '../../query/query';

import {
  LoadOptions,
  QueryLoader,
  QueryLoaderContext,
  QueryLoaderError,
  QueryLoaderEvents,
  QueryLoaderKey,
  SessionOptions,
} from '../../query/query-loader';

import { batchLoad } from './batch-load';
import { QueryableSession } from './description';

export interface QueryableSessionId {
  /**
   * Session.cookieId
   */
  cookieId: string;
}

export type QueryableSessionLoaderKey = QueryLoaderKey<
  QueryableSessionId,
  Infer<typeof QueryableSession>,
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
  Infer<typeof QueryableSession>
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
        return batchLoad(keys, context);
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

  load<V extends QueryDeep<Infer<typeof QueryableSession>>>(
    key: Parameters<typeof this.loader.load<V>>[0],
    options?: SessionOptions<LoadOptions<RequestContext>>
  ): ReturnType<typeof this.loader.load<V>> {
    return this.loader.load(key, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }
}
