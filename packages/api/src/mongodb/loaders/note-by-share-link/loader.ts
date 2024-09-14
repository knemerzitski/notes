import DataLoader from 'dataloader';
import { AggregateOptions } from 'mongodb';

import { callFnGrouped } from '~utils/call-fn-grouped';

import { Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../../collections';
import { MongoDBContext } from '../../context';
import { LoaderEvents } from '../../loaders';
import { QueryResultDeep } from '../../query/query';

import { QueryableNote } from '../note/descriptions/note';

import { getEqualObjectString } from '../../query/utils/get-equal-object-string';

export interface QueryableNoteByShareLinkLoaderContext {
  eventBus?: Emitter<LoaderEvents>;
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES
  >;
}

type QueryableNoteByShareLinkLoadKeyWithSession = {
  noteKey: QueryableNoteByShareLinkLoadKey;
} & Pick<AggregateOptions, 'session'>;

export class QueryableNoteByShareLinkLoader {
  private readonly context: Readonly<QueryableNoteByShareLinkLoaderContext>;

  private readonly loader: DataLoader<
    QueryableNoteByShareLinkLoadKeyWithSession,
    QueryResultDeep<QueryableNote>,
    string
  >;

  constructor(context: Readonly<QueryableNoteByShareLinkLoaderContext>) {
    this.context = context;

    this.loader = new DataLoader<
      QueryableNoteByShareLinkLoadKeyWithSession,
      QueryResultDeep<QueryableNote>,
      string
    >(
      async (keys) =>
        callFnGrouped(
          keys,
          (key) => key.session,
          (keys, session) =>
            queryableNoteByShareLinkBatchLoad(
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
    key: QueryableNoteByShareLinkLoadKey,
    aggregateOptions?: Pick<AggregateOptions, 'session'>
  ) {
    const loaderKey: QueryableNoteByShareLinkLoadKeyWithSession = {
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
        eventBus.emit('loadedNoteByShareLink', {
          key,
          value: result,
        });
      }

      return result;
    }
  }
}


export interface QueryableNoteByShareLinkLoadKey {
  /**
   * Note.shareNoteLinks.publicId
   */
  shareNoteLinkPublicId: string;
  /**
   * Fields to retrieve, inclusion projection with inner paginations.
   */
  noteQuery: QueryDeep<QueryableNote>;
}




