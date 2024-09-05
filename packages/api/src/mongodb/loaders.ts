import { mitt } from '~utils/mitt-unsub';

import { MongoDBCollections } from './collections';
import { MongoDBContext } from './context';
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
import { PartialQueryResultDeep } from './query/query';
import { QueryableNote } from './descriptions/note';
import { QueryableUser } from './descriptions/user';
import { QueryableSession } from './descriptions/session';
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
    value: PartialQueryResultDeep<QueryableSession>;
  };
  loadedUser: {
    key: QueryableUserLoaderKey;
    value: PartialQueryResultDeep<QueryableUser>;
  };
  loadedNote: {
    key: QueryableNoteLoaderKey;
    value: PartialQueryResultDeep<QueryableNote>;
  };
  loadedNotesSearch: {
    key: QueryableNotesSearchLoaderKey;
    value: PartialQueryResultDeep<QueryableSearchNote[]>;
  };
  loadedNoteByShareLink: {
    key: QueryableNoteByShareLinkLoadKey;
    value: PartialQueryResultDeep<QueryableNote>;
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
