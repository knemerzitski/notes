import mitt from '~utils/mitt-unsub';

import { MongoDBCollections } from './collections';
import { MongoDBContext } from './lambda-context';
import QueryableUserLoader from './loaders/QueryableUserLoader';
import QueryableUserNoteLoader from './loaders/QueryableUserNoteLoader';
import { QueryableUserLoadKey } from './loaders/queryableUserBatchLoad';
import { QueryableUserNoteLoadKey } from './loaders/queryableUserNoteBatchLoad';
import { DeepQueryResult } from './query/query';
import { QueryableUser } from './schema/user/query/queryable-user';
import { QueryableUserNote } from './schema/user-note/query/queryable-user-note';

export interface MongoDBLoaders {
  user: QueryableUserLoader;
  userNote: QueryableUserNoteLoader;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LoaderEvents = {
  loadedUser: {
    key: QueryableUserLoadKey;
    value: DeepQueryResult<QueryableUser>;
  };
  loadedUserNote: {
    key: QueryableUserNoteLoadKey;
    value: DeepQueryResult<QueryableUserNote>;
  };
};

export function createMongoDBLoaders(
  context: MongoDBContext<MongoDBCollections>
): MongoDBLoaders {
  const loadersEventBus = mitt<LoaderEvents>();

  return {
    user: new QueryableUserLoader({
      ...context,
      eventBus: loadersEventBus,
    }),
    userNote: new QueryableUserNoteLoader({
      ...context,
      eventBus: loadersEventBus,
    }),
  };
}
