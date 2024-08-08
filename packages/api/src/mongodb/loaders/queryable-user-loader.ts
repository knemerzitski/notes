import DataLoader from 'dataloader';
import { AggregateOptions } from 'mongodb';

import { callFnGrouped } from '~utils/call-fn-grouped';

import { Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';
import { DeepQueryResult } from '../query/query';

import { QueryableUser } from '../schema/user/query/queryable-user';

import { QueryableUserLoadKey, queryableUserBatchLoad } from './queryable-user-batch-load';

import { getEqualObjectString } from './utils/get-equal-object-string';

export interface QueryableUserLoaderContext {
  eventBus?: Emitter<LoaderEvents>;
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.USERS | CollectionName.NOTES
  >;
}

type QueryableUserLoadKeyWithSession = {
  userKey: QueryableUserLoadKey;
} & Pick<AggregateOptions, 'session'>;

export class QueryableUserLoader {
  private readonly context: Readonly<QueryableUserLoaderContext>;

  private readonly loader: DataLoader<
    QueryableUserLoadKeyWithSession,
    DeepQueryResult<QueryableUser>,
    string
  >;

  constructor(context: Readonly<QueryableUserLoaderContext>) {
    this.context = context;

    this.loader = new DataLoader<
      QueryableUserLoadKeyWithSession,
      DeepQueryResult<QueryableUser>,
      string
    >(
      async (keys) =>
        callFnGrouped(
          keys,
          (key) => key.session,
          (keys, session) =>
            queryableUserBatchLoad(
              keys.map(({ userKey }) => userKey),
              this.context,
              {
                session,
              }
            )
        ),
      {
        cacheKeyFn: (key) => {
          return getEqualObjectString(key.userKey);
        },
      }
    );
  }

  async load(
    key: QueryableUserLoadKey,
    aggregateOptions?: Pick<AggregateOptions, 'session'>
  ) {
    const loaderKey: QueryableUserLoadKeyWithSession = {
      userKey: key,
    };
    if (aggregateOptions?.session) {
      loaderKey.session = aggregateOptions.session;
      // Clear key since session implies a transaction where returned value must be always up-to-date
      return this.loader.clear(loaderKey).load(loaderKey);
    } else {
      const result = await this.loader.load(loaderKey);

      // Notify other loaders
      const eventBus = this.context.eventBus;
      if (eventBus) {
        eventBus.emit('loadedUser', {
          key,
          value: result,
        });
      }

      return result;
    }
  }
}
