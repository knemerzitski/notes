import { AggregateOptions, ObjectId } from 'mongodb';

import { mitt, Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../../collections';
import { MongoDBContext } from '../../context';
import { LoaderEvents } from '../../loaders';

import { MongoQueryFn, QueryDeep } from '../../query/query';
import { QueryableNote } from './descriptions/note';

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
import { batchLoad } from './batch-load';
import { queryArgsRemoved } from '../../query/utils/query-args-removed';

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
  QueryableNote,
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
  QueryableNote
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
    id: QueryableNoteId,
    options?: SessionOptions<CreateQueryFnOptions<RequestContext, QueryableNote>>
  ): MongoQueryFn<QueryableNote> {
    return this.loader.createQueryFn(id, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }

  private primeNotesFromLoadedUser({ key, value }: LoaderEvents['loadedUser']) {
    if (!key.query.note?.categories) {
      return;
    }

    Object.entries(key.query.note.categories).forEach(([categoryName, categoryMeta]) => {
      const noteQuery = categoryMeta?.notes;
      if (!noteQuery) {
        return;
      }
      const noteQueryNoArgs = queryArgsRemoved(noteQuery);

      const resultCategoryMeta = value.note?.categories?.[categoryName];
      if (!resultCategoryMeta) {
        return;
      }
      resultCategoryMeta.notes?.forEach((note) => {
        if (!note?._id) return;

        if ('userId' in key.id) {
          this.loader.prime(
            {
              id: {
                userId: key.id.userId,
                noteId: note._id,
              },
              query: noteQueryNoArgs,
            },
            note
          );
        }

        this.loader.prime(
          {
            id: {
              noteId: note._id,
            },
            query: noteQueryNoArgs,
          },
          note
        );
      });
    });
  }
}
