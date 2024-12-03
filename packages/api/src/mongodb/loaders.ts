import mitt from 'mitt';

import { MongoDBCollections } from './collections';
import { MongoDBContext } from './context';
import { QueryableNote } from './loaders/note/descriptions/note';
import { QueryableNoteId, QueryableNoteLoader } from './loaders/note/loader';
import {
  QueryableNoteByShareLinkId,
  QueryableNoteByShareLinkLoader,
} from './loaders/note-by-share-link/loader';
import { QueryableSearchNotes } from './loaders/notes-search/description';
import {
  QueryableNotesSearchId,
  QueryableNotesSearchLoader,
} from './loaders/notes-search/loader';
import { QueryableSession } from './loaders/session/description';
import { QueryableSessionId, QueryableSessionLoader } from './loaders/session/loader';
import { QueryableUser } from './loaders/user/description';
import { QueryableUserId, QueryableUserLoader } from './loaders/user/loader';
import { QueryLoaderEvents } from './query/query-loader';

export interface MongoDBLoaders {
  session: QueryableSessionLoader;
  user: QueryableUserLoader;
  note: QueryableNoteLoader;
  notesSearch: QueryableNotesSearchLoader;
  noteByShareLink: QueryableNoteByShareLinkLoader;
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
  loadedNoteByShareLink: QueryLoaderEvents<
    QueryableNoteByShareLinkId,
    typeof QueryableNote
  >['loaded'];
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
      context,
      eventBus: loadersEventBus,
    }),
  };
}
