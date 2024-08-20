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
import { QueryResultDeep } from './query/query';
import { QueryableNote } from './schema/note/query/queryable-note';
import { QueryableUser } from './schema/user/query/queryable-user';
import { QueryableSession } from './schema/session/query/queryable-session';
import {
  QueryableSessionLoader,
  QueryableSessionLoaderKey,
} from './loaders/queryable-session-loader';

export interface MongoDBLoaders {
  session: QueryableSessionLoader;
  user: QueryableUserLoader;
  note: QueryableNoteLoader;
  notesSearch: QueryableNotesSearchLoader;
  noteByShareLink: QueryableNoteByShareLinkLoader;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LoaderEvents = {
  loadedSession: {
    key: QueryableSessionLoaderKey;
    value: QueryResultDeep<QueryableSession>;
  };
  loadedUser: {
    key: QueryableUserLoaderKey;
    value: QueryResultDeep<QueryableUser>;
  };
  loadedNote: {
    key: QueryableNoteLoaderKey;
    value: QueryResultDeep<QueryableNote>;
  };
  loadedNotesSearch: {
    key: QueryableNotesSearchLoaderKey;
    value: QueryResultDeep<QueryableSearchNote[]>;
  };
  loadedNoteByShareLink: {
    key: QueryableNoteByShareLinkLoadKey;
    value: QueryResultDeep<QueryableNote>;
  };
};

export function createMongoDBLoaders(
  context: MongoDBContext<MongoDBCollections>
): MongoDBLoaders {
  const loadersEventBus = mitt<LoaderEvents>();

  return {
    session: new QueryableSessionLoader({
      context,
      eventBus: loadersEventBus,
    }),
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
