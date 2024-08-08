import DataLoader from 'dataloader';
import { AggregateOptions } from 'mongodb';

import { callFnGrouped } from '~utils/call-fn-grouped';

import { Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';
import { DeepQueryResult } from '../query/query';

import {
  QueryableNotesSearchLoadKey,
  QueryableNoteSearch,
  notesSearchBatchLoad,
} from './notes-search-batch-load';
import { getEqualObjectString } from './utils/get-equal-object-string';

export interface QueryableNotesSearchLoaderContext {
  eventBus?: Emitter<LoaderEvents>;
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES
  >;
}

type QueryableNotesSearchLoadKeyWithSession = {
  noteKey: QueryableNotesSearchLoadKey;
} & Pick<AggregateOptions, 'session'>;

export class QueryableNotesSearchLoader {
  private readonly context: Readonly<QueryableNotesSearchLoaderContext>;

  private readonly loader: DataLoader<
    QueryableNotesSearchLoadKeyWithSession,
    DeepQueryResult<QueryableNoteSearch[]>,
    string
  >;

  constructor(context: Readonly<QueryableNotesSearchLoaderContext>) {
    this.context = context;

    this.loader = new DataLoader<
      QueryableNotesSearchLoadKeyWithSession,
      DeepQueryResult<QueryableNoteSearch[]>,
      string
    >(
      async (keys) =>
        callFnGrouped(
          keys,
          (key) => key.session,
          (keys, session) =>
            notesSearchBatchLoad(
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
  }

  async load(
    key: QueryableNotesSearchLoadKey,
    aggregateOptions?: Pick<AggregateOptions, 'session'>
  ) {
    const loaderKey: QueryableNotesSearchLoadKeyWithSession = {
      noteKey: key,
    };
    if (aggregateOptions?.session) {
      loaderKey.session = aggregateOptions.session;
      // Clear key since session implies a transaction where returned value must be always up-to-date
      return this.loader.clear(loaderKey).load(loaderKey);
    } else {
      const result = await this.loader.load(loaderKey);

      return result;
    }
  }
}
