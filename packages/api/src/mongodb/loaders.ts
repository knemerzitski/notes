import { mitt } from '~utils/mitt-unsub';

import { MongoDBCollections } from './collections';
import { MongoDBContext } from './lambda-context';
import { QueryableNoteByShareLinkLoadKey } from './loaders/queryable-note-by-share-link-batch-load';
import { QueryableNoteByShareLinkLoader } from './loaders/queryable-note-by-share-link-loader';
import {
  QueryableNoteLoader,
  QueryableNoteLoaderKey,
} from './loaders/queryable-note-loader';
import {
  QueryableNotesSearchLoader,
  QueryableNotesSearchLoaderKey,
  QueryableSearchNote,
} from './loaders/queryable-notes-search-loader';
import {
  QueryableUserLoader,
  QueryableUserLoaderKey,
} from './loaders/queryable-user-loader';
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
    key: QueryableUserLoaderKey;
    value: DeepQueryResult<QueryableUser>;
  };
  loadedNote: {
    key: QueryableNoteLoaderKey;
    value: DeepQueryResult<QueryableNote>;
  };
  loadedNotesSearch: {
    key: QueryableNotesSearchLoaderKey;
    value: DeepQueryResult<QueryableSearchNote[]>;
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
      context,
      eventBus: loadersEventBus,
    }),
    note: new QueryableNoteLoader({
      context,
      eventBus: loadersEventBus,
    }),
    notesSearch: new QueryableNotesSearchLoader({
      context,
      eventBus: loadersEventBus,
    }),
    noteByShareLink: new QueryableNoteByShareLinkLoader({
      ...context,
      eventBus: loadersEventBus,
    }),
  };
}
