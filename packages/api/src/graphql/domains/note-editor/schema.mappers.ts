import { QueryableNoteUser } from '../../../mongodb/loaders/note/descriptions/note';
import { MongoQueryFn } from '../../../mongodb/query/query';

export interface UserCollabTextEditStateMapper {
  readonly query: MongoQueryFn<
    NonNullable<NonNullable<QueryableNoteUser['editing']>['collabText']>
  >;
}