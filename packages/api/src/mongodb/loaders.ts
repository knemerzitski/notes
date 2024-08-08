import { mitt } from '~utils/mitt-unsub';

import { MongoDBCollections } from './collections';
import { MongoDBContext } from './lambda-context';
import {
  QueryableNoteSearch,
  QueryableNotesSearchLoadKey,
} from './loaders/notes-search-batch-load';
import { QueryableNoteLoadKey } from './loaders/queryable-note-batch-load';
import { QueryableNoteByShareLinkLoadKey } from './loaders/queryable-note-by-share-link-batch-load';
import { QueryableNoteByShareLinkLoader } from './loaders/queryable-note-by-share-link-loader';
import { QueryableNoteLoader } from './loaders/queryable-note-loader';
import { QueryableNotesSearchLoader } from './loaders/queryable-notes-search-loader';
import { QueryableUserLoadKey } from './loaders/queryable-user-batch-load';
import { QueryableUserLoader } from './loaders/queryable-user-loader';
import { DeepQueryResult } from './query/query';
import { QueryableNote } from './schema/note/query/queryable-note';
import { QueryableUser } from './schema/user/query/queryable-user';

export interface MongoDBLoaders {
  user: QueryableUserLoader;
  note: QueryableNoteLoader;
  notesSearch: QueryableNotesSearchLoader;
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
  loadedNotesSearch: {
    key: QueryableNotesSearchLoadKey;
    value: DeepQueryResult<QueryableNoteSearch>;
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
    notesSearch: new QueryableNotesSearchLoader({
      ...context,
      eventBus: loadersEventBus,
    }),
    noteByShareLink: new QueryableNoteByShareLinkLoader({
      ...context,
      eventBus: loadersEventBus,
    }),
  };
}
