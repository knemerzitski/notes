import mitt from '~utils/mitt-unsub';

import { MongoDBCollections } from './collections';
import { MongoDBContext } from './lambda-context';
import QueryableNoteByShareLinkLoader from './loaders/QueryableNoteByShareLinkLoader';
import QueryableNoteLoader from './loaders/QueryableNoteLoader';
import QueryableUserLoader from './loaders/QueryableUserLoader';
import { QueryableNoteLoadKey } from './loaders/queryableNoteBatchLoad';
import { QueryableNoteByShareLinkLoadKey } from './loaders/queryableNoteByShareLinkBatchLoad';
import { QueryableUserLoadKey } from './loaders/queryableUserBatchLoad';
import { DeepQueryResult } from './query/query';
import { QueryableNote } from './schema/note/query/queryable-note';
import { QueryableUser } from './schema/user/query/queryable-user';

export interface MongoDBLoaders {
  user: QueryableUserLoader;
  note: QueryableNoteLoader;
  noteByShareLink: QueryableNoteByShareLinkLoader;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LoaderEvents = {
  loadedUser: {
    key: QueryableUserLoadKey;
    value: DeepQueryResult<QueryableUser>;
  };
  loadedNote: {
    key: QueryableNoteLoadKey;
    value: DeepQueryResult<QueryableNote>;
  };
  loadedNoteByShareLink: {
    key: QueryableNoteByShareLinkLoadKey;
    value: DeepQueryResult<QueryableNote>;
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
    note: new QueryableNoteLoader({
      ...context,
      eventBus: loadersEventBus,
    }),
    noteByShareLink: new QueryableNoteByShareLinkLoader({
      ...context,
      eventBus: loadersEventBus,
    }),
  };
}
