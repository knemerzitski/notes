import { mitt } from '~utils/mitt-unsub';

import { MongoDBCollections } from './collections';
import { MongoDBContext } from './context';
import { QueryableNoteId, QueryableNoteLoader } from './loaders/queryable-note-loader';
import { QueryableUserId, QueryableUserLoader } from './loaders/queryable-user-loader';
import { QueryableNote } from './descriptions/note';
import { QueryableUser } from './descriptions/user';
import {
  QueryableSessionId,
  QueryableSessionLoader,
} from './loaders/queryable-session-loader';
import { QueryLoaderEvents } from './query/query-loader';
import {
  QueryableNotesSearchId,
  QueryableNotesSearchLoader,
  QueryableSearchNotes,
} from './loaders/queryable-notes-search-loader';
import { QueryableSession } from './descriptions/session';

export interface MongoDBLoaders {
  session: QueryableSessionLoader;
  user: QueryableUserLoader;
  note: QueryableNoteLoader;
  notesSearch: QueryableNotesSearchLoader;
  // noteByShareLink: QueryableNoteByShareLinkLoader;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LoaderEvents = {
  loadedSession: QueryLoaderEvents<QueryableSessionId, typeof QueryableSession>['loaded'];
  loadedUser: QueryLoaderEvents<QueryableUserId, typeof QueryableUser>['loaded'];
  loadedNote: QueryLoaderEvents<QueryableNoteId, typeof QueryableNote>['loaded'];
  loadedNotesSearch: QueryLoaderEvents<
    QueryableNotesSearchId,
    typeof QueryableSearchNotes
  >['loaded'];
  // loadedNoteByShareLink: {
  //   key: QueryableNoteByShareLinkLoadKey;
  //   // value: PartialQueryResultDeep<QueryableNote>;
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   value: PartialQueryResultDeep<any>;
  // };
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
    // noteByShareLink: new QueryableNoteByShareLinkLoader({
    //   ...context,
    //   eventBus: loadersEventBus,
    // }),
  };
}
