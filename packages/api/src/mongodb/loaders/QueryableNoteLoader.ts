import DataLoader from 'dataloader';
import { AggregateOptions } from 'mongodb';

import callFnGrouped from '~utils/callFnGrouped';

import { Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';
import { DeepQueryResult } from '../query/query';

import { QueryableNote } from '../schema/note/query/queryable-note';

import queryableNoteBatchLoad, { QueryableNoteLoadKey } from './queryableNoteBatchLoad';

import getEqualObjectString from './utils/getEqualObjectString';

export interface QueryableNoteLoaderContext {
  eventBus?: Emitter<LoaderEvents>;
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES
  >;
}

type QueryableNoteLoadKeyWithSession = {
  noteKey: QueryableNoteLoadKey;
} & Pick<AggregateOptions, 'session'>;

export default class QueryableNoteLoader {
  private readonly context: Readonly<QueryableNoteLoaderContext>;

  private readonly loader: DataLoader<
    QueryableNoteLoadKeyWithSession,
    DeepQueryResult<QueryableNote>,
    string
  >;

  constructor(context: Readonly<QueryableNoteLoaderContext>) {
    this.context = context;

    this.loader = new DataLoader<
      QueryableNoteLoadKeyWithSession,
      DeepQueryResult<QueryableNote>,
      string
    >(
      async (keys) =>
        callFnGrouped(
          keys,
          (key) => key.session,
          (keys, session) =>
            queryableNoteBatchLoad(
              keys.map(({ noteKey }) => noteKey),
              this.context,
              {
                session,
              }
            )
        ),
      {
        cacheKeyFn: (key) => {
          return getEqualObjectString(key.noteKey);
        },
      }
    );

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
    const loaderKey: QueryableNoteLoadKeyWithSession = {
      noteKey: key,
    };
    if (aggregateOptions?.session) {
      loaderKey.session = aggregateOptions.session;
      // Clear key since session implies a transaction where returned value must be always up-to-date
      return this.loader.clear(loaderKey).load(loaderKey);
    } else {
      const result = await this.loader.load(loaderKey);

      const eventBus = this.context.eventBus;
      if (eventBus) {
        eventBus.emit('loadedNote', {
          key,
          value: result,
        });
      }

      return result;
    }
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
              noteKey: {
                userId,
                publicId: note.publicId,
                noteQuery: noteQuery,
              },
            },
            note
          );
        });
      }
    );
  }
}
