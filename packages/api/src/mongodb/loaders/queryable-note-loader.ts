import { AggregateOptions } from 'mongodb';

import { mitt, Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';

import { QueryableNote } from '../schema/note/query/queryable-note';

import { QueryLoaderEvents, QueryLoader } from './query-loader';
import { QueryableNoteLoadKey, queryableNoteBatchLoad } from './queryable-note-batch-load';

export interface QueryableNoteLoaderContext {
  eventBus?: Emitter<LoaderEvents>;
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES
  >;
}

export class QueryableNoteLoader {
  private readonly loader: QueryLoader<
    Pick<QueryableNoteLoadKey, 'userId' | 'publicId'>,
    QueryableNote,
    QueryableNoteLoaderContext,
    AggregateOptions['session']
  >;

  constructor(context: Readonly<QueryableNoteLoaderContext>) {
    const loaderEventBus =
      mitt<
        QueryLoaderEvents<
          Pick<QueryableNoteLoadKey, 'userId' | 'publicId'>,
          QueryableNote
        >
      >();
    if (context.eventBus) {
      loaderEventBus.on('loaded', ({ key, value }) => {
        context.eventBus?.emit('loadedNote', {
          key: {
            userId: key.id.userId,
            publicId: key.id.publicId,
            noteQuery: key.query,
          },
          value,
        });
      });
    }

    this.loader = new QueryLoader({
      eventBus: context.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => {
        return queryableNoteBatchLoad(
          keys.map((key) => ({
            userId: key.id.userId,
            publicId: key.id.publicId,
            noteQuery: key.query,
          })),
          context.global,
          {
            session: context.request,
          }
        );
      },
      context,
    });

    if (context.eventBus) {
      context.eventBus.on('loadedUser', (payload) => {
        this.primeNotesLoadedUser(payload);
      });
    }
  }

  async load(
    key: QueryableNoteLoadKey,
    aggregateOptions?: Pick<AggregateOptions, 'session'>
  ) {
    return this.loader.load(
      {
        id: {
          userId: key.userId,
          publicId: key.publicId,
        },
        query: key.noteQuery,
      },
      {
        context: aggregateOptions?.session,
        skipCache: aggregateOptions?.session != null,
      }
    );
  }

  private primeNotesLoadedUser({ key, value }: LoaderEvents['loadedUser']) {
    if (!key.userQuery.notes?.category) {
      return;
    }

    const userId = key.userId;
    Object.entries(key.userQuery.notes.category).forEach(
      ([categoryName, categoryMeta]) => {
        const noteQuery = categoryMeta?.order?.items?.$query;
        if (!noteQuery) {
          return;
        }

        const resultCategoryMeta = value.notes?.category?.[categoryName];
        if (!resultCategoryMeta) {
          return;
        }
        resultCategoryMeta.order?.items?.forEach((note) => {
          if (!note.publicId) return;
          this.loader.prime(
            {
              id: {
                userId,
                publicId: note.publicId,
              },
              query: noteQuery,
            },
            note
          );
        });
      }
    );
  }
}
