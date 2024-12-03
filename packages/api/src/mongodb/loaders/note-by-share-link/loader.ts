
import mitt, { Emitter } from 'mitt';
import { AggregateOptions, ObjectId } from 'mongodb';

import { CollectionName, MongoDBCollections } from '../../collections';
import { MongoDBContext } from '../../context';
import { LoaderEvents } from '../../loaders';
import { MongoQueryFn, QueryDeep } from '../../query/query';


import {
  CreateQueryFnOptions,
  QueryLoader,
  QueryLoaderContext,
  QueryLoaderError,
  QueryLoaderEvents,
  QueryLoaderKey,
  SessionOptions,
} from '../../query/query-loader';
import { objectIdToStr } from '../../utils/objectid';
import { QueryableNote } from '../note/descriptions/note';

import { batchLoad } from './batch-load';

export interface QueryableNoteByShareLinkId {
  /**
   * Note.shareLinks._id
   */
  shareLinkId: ObjectId;
}

export type QueryableNoteByShareLinkLoaderKey = QueryLoaderKey<
  QueryableNoteByShareLinkId,
  QueryableNote,
  QueryableNoteByShareLinkLoadContext
>['cache'];

export interface QueryableNoteByShareLinkLoaderParams {
  eventBus?: Emitter<LoaderEvents>;
  context: GlobalContext;
}

export type QueryableNoteByShareLinkLoadContext = QueryLoaderContext<
  GlobalContext,
  RequestContext
>;

interface GlobalContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES | CollectionName.USERS | CollectionName.OPEN_NOTES
  >;
}

type RequestContext = AggregateOptions['session'];

export class NoteByShareLinkNotFoundQueryLoaderError extends QueryLoaderError<
  QueryableNoteByShareLinkId,
  QueryableNote
> {
  override readonly key: QueryableNoteByShareLinkLoaderKey;

  constructor(key: QueryableNoteByShareLinkLoaderKey) {
    super(`Note by share link '${objectIdToStr(key.id.shareLinkId)}' not found`, key);
    this.key = key;
  }
}

export class QueryableNoteByShareLinkLoader {
  private readonly loader: QueryLoader<
    QueryableNoteByShareLinkId,
    typeof QueryableNote,
    GlobalContext,
    RequestContext
  >;

  constructor(params: Readonly<QueryableNoteByShareLinkLoaderParams>) {
    const loaderEventBus =
      mitt<QueryLoaderEvents<QueryableNoteByShareLinkId, typeof QueryableNote>>();
    if (params.eventBus) {
      loaderEventBus.on('loaded', (payload) => {
        params.eventBus?.emit('loadedNoteByShareLink', payload);
      });
    }

    this.loader = new QueryLoader({
      eventBus: params.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => batchLoad(keys, context),
      context: params.context,
      struct: QueryableNote,
    });
  }

  prime(
    ...args: Parameters<typeof this.loader.prime>
  ): ReturnType<typeof this.loader.prime> {
    this.loader.prime(...args);
  }

  load<V extends QueryDeep<QueryableNote>>(
    key: Parameters<typeof this.loader.load<V>>[0],
    options?: {
      session?: RequestContext;
    }
  ): ReturnType<typeof this.loader.load<V>> {
    return this.loader.load(key, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }

  createQueryFn(
    id: QueryableNoteByShareLinkId,
    options?: SessionOptions<CreateQueryFnOptions<RequestContext, QueryableNote>>
  ): MongoQueryFn<QueryableNote> {
    return this.loader.createQueryFn(id, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }
}
