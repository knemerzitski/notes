import { AggregateOptions, ObjectId } from 'mongodb';

import { Emitter, mitt } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../../collections';
import { MongoDBContext } from '../../context';
import { LoaderEvents } from '../../loaders';

import { RelayPagination } from '../../pagination/relay-array-pagination';

import { MongoQueryFn, QueryDeep } from '../../query/query';

import {
  CreateQueryFnOptions,
  LoadOptions,
  QueryLoader,
  QueryLoaderContext,
  QueryLoaderEvents,
  QueryLoaderKey,
  SessionOptions,
} from '../../query/query-loader';
import { Infer, InferRaw } from 'superstruct';
import { QueryableSearchNotes } from './description';
import { batchLoad } from './batch-load';

export interface QueryableNotesSearchId {
  /**
   * Note.users._id
   */
  userId: ObjectId;
  /**
   * Text to find in note
   */
  searchText: string;
  /**
   * Paginate search results
   */
  pagination?: RelayPagination<string>;
}

export type QueryableNotesSearchLoaderKey = QueryLoaderKey<
  QueryableNotesSearchId,
  InferRaw<typeof QueryableSearchNotes>,
  QueryableNotesSearchLoadContext
>['cache'];

export interface QueryableNotesSearchLoaderParams {
  eventBus?: Emitter<LoaderEvents>;
  context: GlobalContext;
}

export type QueryableNotesSearchLoadContext = QueryLoaderContext<
  GlobalContext,
  RequestContext
>;

interface GlobalContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES | CollectionName.USERS
  >;
}

type RequestContext = AggregateOptions['session'];

export class QueryableNotesSearchLoader {
  private readonly loader: QueryLoader<
    QueryableNotesSearchId,
    typeof QueryableSearchNotes,
    GlobalContext,
    RequestContext
  >;

  constructor(params: Readonly<QueryableNotesSearchLoaderParams>) {
    const loaderEventBus =
      mitt<QueryLoaderEvents<QueryableNotesSearchId, typeof QueryableSearchNotes>>();
    if (params.eventBus) {
      loaderEventBus.on('loaded', (payload) => {
        params.eventBus?.emit('loadedNotesSearch', payload);
      });
    }

    this.loader = new QueryLoader({
      eventBus: params.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => {
        return batchLoad(keys, context);
      },
      context: params.context,
      struct: QueryableSearchNotes,
    });
  }

  load<
    V extends QueryDeep<Infer<typeof QueryableSearchNotes>>,
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
    id: QueryableNotesSearchId,
    options?: SessionOptions<
      CreateQueryFnOptions<RequestContext, typeof QueryableSearchNotes>
    >
  ): MongoQueryFn<typeof QueryableSearchNotes> {
    return this.loader.createQueryFn(id, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }
}
