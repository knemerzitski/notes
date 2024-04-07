import { ObjectId } from 'mongodb';
import { DBCollabText } from '../models/collab/collab-text';
import userNotesArray, {
  UserNotesArrayInput,
  UserNotesArrayOutput,
} from './userNotesArray';
import relayArrayPagination, {
  RelayArrayPaginationInput,
  RelayArrayPaginationOutput,
} from './relayArrayPagination';

export interface RelayPaginateUserNotesArrayInput<TField extends string> {
  pagination: RelayArrayPaginationInput<ObjectId>;
  userNotes: Omit<UserNotesArrayInput<TField>, 'fieldPath'>;
}

export interface RelayPaginateUserNotesArrayOuput<
  TField extends string,
  TCollaborativeDocumentPipeline = DBCollabText<unknown>,
> extends UserNotesArrayOutput<TField, TCollaborativeDocumentPipeline> {
  firstId: ObjectId;
  lastId: ObjectId;
  sizes: Exclude<
    RelayArrayPaginationOutput<ObjectId>['paginations']['sizes'],
    undefined
  > | null;
}

export default function relayPaginateUserNotesArray<TField extends string>(
  input: RelayPaginateUserNotesArrayInput<TField>
) {
  return [
    {
      $project: relayArrayPagination(input.pagination),
    },
    ...userNotesArray({
      ...input.userNotes,
      fieldPath: 'paginations.array',
      groupExpression: {
        ...input.userNotes.groupExpression,
        firstId: { $first: '$firstElement' },
        lastId: { $first: '$lastElement' },
        sizes: { $first: '$paginations.sizes' },
      },
    }),
  ];
}
