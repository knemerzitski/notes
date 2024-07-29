import DataLoader from 'dataloader';
import { AggregateOptions } from 'mongodb';

import callFnGrouped from '~utils/callFnGrouped';

import { Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';
import { DeepQueryResult } from '../query/query';
import { QueryableUserNote } from '../schema/user-note/query/queryable-user-note';

import queryableUserNoteBatchLoad, {
  QueryableUserNoteLoadKey,
} from './queryableUserNoteBatchLoad';

import getEqualObjectString from './utils/getEqualObjectString';

export interface QueryableUserNoteLoaderContext {
  eventBus?: Emitter<LoaderEvents>;
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    | CollectionName.USERS
    | CollectionName.USER_NOTES
    | CollectionName.NOTES
    | CollectionName.SHARE_NOTE_LINKS
  >;
}

type QueryableUserNoteLoadKeyWithSession = {
  userNoteKey: QueryableUserNoteLoadKey;
} & Pick<AggregateOptions, 'session'>;

export default class QueryableUserNoteLoader {
  private readonly context: Readonly<QueryableUserNoteLoaderContext>;

  private readonly loader: DataLoader<
    QueryableUserNoteLoadKeyWithSession,
    DeepQueryResult<QueryableUserNote>,
    string
  >;

  constructor(context: Readonly<QueryableUserNoteLoaderContext>) {
    this.context = context;

    this.loader = new DataLoader<
      QueryableUserNoteLoadKeyWithSession,
      DeepQueryResult<QueryableUserNote>,
      string
    >(
      async (keys) =>
        callFnGrouped(
          keys,
          (key) => key.session,
          (keys, session) =>
            queryableUserNoteBatchLoad(
              keys.map(({ userNoteKey }) => userNoteKey),
              this.context,
              {
                session,
              }
            )
        ),
      {
        cacheKeyFn: (key) => {
          return getEqualObjectString(key.userNoteKey);
        },
      }
    );

    if (context.eventBus) {
      context.eventBus.on('loadedUser', (payload) => {
        this.primeUserNotesFromUser(payload);
      });
    }
  }

  async load(
    key: QueryableUserNoteLoadKey,
    aggregateOptions?: Pick<AggregateOptions, 'session'>
  ) {
    const loaderKey: QueryableUserNoteLoadKeyWithSession = {
      userNoteKey: key,
    };
    if (aggregateOptions?.session) {
      loaderKey.session = aggregateOptions.session;
      // Clear key since session implies a transaction where returned value must be always up-to-date
      return this.loader.clear(loaderKey).load(loaderKey);
    } else {
      const result = await this.loader.load(loaderKey);

      const eventBus = this.context.eventBus;
      if (eventBus) {
        eventBus.emit('loadedUserNote', {
          key,
          value: result,
        });
      }

      return result;
    }
  }

  private primeUserNotesFromUser({ key, value }: LoaderEvents['loadedUser']) {
    if (!key.userQuery.notes?.category) {
      return;
    }

    const userId = key.userId;
    Object.entries(key.userQuery.notes.category).forEach(
      ([categoryName, categoryMeta]) => {
        const userNoteQuery = categoryMeta?.order?.items?.$query;
        if (!userNoteQuery) {
          return;
        }

        const resultCategoryMeta = value.notes?.category?.[categoryName];
        if (!resultCategoryMeta) {
          return;
        }
        resultCategoryMeta.order?.items?.forEach((userNote) => {
          if (!userNote.note?.publicId) return;
          this.loader.prime(
            {
              userNoteKey: {
                userId,
                publicId: userNote.note.publicId,
                userNoteQuery: userNoteQuery,
              },
            },
            userNote
          );
        });
      }
    );
  }
}
