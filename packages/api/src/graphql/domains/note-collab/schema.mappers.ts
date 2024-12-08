import { QueryableNoteUser } from '../../../mongodb/loaders/note/descriptions/note';
import { MongoQueryFn } from '../../../mongodb/query/query';

export interface OpenedNoteMapper {
  readonly query: MongoQueryFn<NonNullable<NonNullable<QueryableNoteUser['openNote']>>>;
}

export interface CollabTextEditingMapper {
  readonly query: MongoQueryFn<
    NonNullable<NonNullable<QueryableNoteUser['openNote']>['collabText']>
  >;
}
