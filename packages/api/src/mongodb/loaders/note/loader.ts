import { AggregateOptions, ObjectId } from 'mongodb';

import { mitt, Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../../collections';
import { MongoDBContext } from '../../context';
import { LoaderEvents } from '../../loaders';

import { MongoQueryFn, QueryDeep } from '../../query/query';
import { QueryableNote } from './descriptions/note';

import {
  QueryLoader,
  QueryLoaderContext,
  QueryLoaderError,
  QueryLoaderEvents,
  QueryLoaderKey,
} from '../../query/query-loader';
import { objectIdToStr } from '../../utils/objectid';
import { Infer, InferRaw } from 'superstruct';
import { batchLoad } from './batch-load';

export interface QueryableNoteId {
  /**
   * Note._id
   */
  noteId: ObjectId;
  /**
   * Note.users._id
   */
  userId?: ObjectId;
}

export type QueryableNoteLoaderKey = QueryLoaderKey<
  QueryableNoteId,
  InferRaw<typeof QueryableNote>,
  QueryableNoteLoadContext
>['cache'];

export interface QueryableNoteLoaderParams {
  eventBus?: Emitter<LoaderEvents>;
  context: GlobalContext;
}

export type QueryableNoteLoadContext = QueryLoaderContext<GlobalContext, RequestContext>;

interface GlobalContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES | CollectionName.USERS
  >;
}

type RequestContext = AggregateOptions['session'];

export class NoteNotFoundQueryLoaderError extends QueryLoaderError<
  QueryableNoteId,
  InferRaw<typeof QueryableNote>
> {
  override readonly key: QueryableNoteLoaderKey;

  constructor(key: QueryableNoteLoaderKey) {
    super(`Note '${objectIdToStr(key.id.noteId)}' not found`, key);
    this.key = key;
  }
}

export class QueryableNoteLoader {
  private readonly loader: QueryLoader<
    QueryableNoteId,
    typeof QueryableNote,
    GlobalContext,
    RequestContext
  >;

  constructor(params: Readonly<QueryableNoteLoaderParams>) {
    const loaderEventBus =
      mitt<QueryLoaderEvents<QueryableNoteId, typeof QueryableNote>>();
    if (params.eventBus) {
      loaderEventBus.on('loaded', (payload) => {
        params.eventBus?.emit('loadedNote', payload);
      });
    }

    this.loader = new QueryLoader({
      eventBus: params.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => batchLoad(keys, context),
      context: params.context,
      struct: QueryableNote,
    });

    if (params.eventBus) {
      params.eventBus.on('loadedUser', (payload) => {
        this.primeNotesFromLoadedUser(payload);
      });
    }
  }

  prime(
    ...args: Parameters<typeof this.loader.prime>
  ): ReturnType<typeof this.loader.prime> {
    this.loader.prime(...args);
  }

  load<
    V extends QueryDeep<Infer<typeof QueryableNote>>,
    T extends 'any' | 'raw' | 'validated' = 'any',
  >(
    key: Parameters<typeof this.loader.load<V, T>>[0],
    options?: {
      resultType?: T;
      session?: RequestContext;
    }
  ): ReturnType<typeof this.loader.load<V, T>> {
    return this.loader.load(key, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }

  createQueryFn(
    id: QueryableNoteId,
    options?: {
      session?: RequestContext;
    }
  ): MongoQueryFn<typeof QueryableNote> {
    return this.loader.createQueryFn(id, {
      context: options?.session,
      clearCache: options?.session != null,
    });
  }

  private primeNotesFromLoadedUser({ key, value }: LoaderEvents['loadedUser']) {
    if (!key.query.notes?.category) {
      return;
    }

    const result = value.result;

    Object.entries(key.query.notes.category).forEach(([categoryName, categoryMeta]) => {
      const noteQuery = categoryMeta?.order?.items;
      if (!noteQuery) {
        return;
      }

      const resultCategoryMeta = result.notes?.category?.[categoryName];
      if (!resultCategoryMeta) {
        return;
      }
      resultCategoryMeta.order?.items?.forEach((note) => {
        if (!note?._id) return;

        this.loader.prime(
          {
            id: {
              noteId: note._id,
            },
            query: noteQuery,
          },
          {
            result: note,
            type: value.type,
          }
        );
      });
    });
  }
}
