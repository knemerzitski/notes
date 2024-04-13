import { ObjectId } from 'mongodb';
import relayArrayPagination, {
  RelayArrayPaginationInput,
  RelayArrayPaginationOutput,
} from './relayArrayPagination';
import userNotesArrayLookup, {
  UserNotesArrayLookupInput,
  UserNotesArrayLookupOutput,
} from '../lookup/userNotesArrayLookup';

export interface RelayPaginateUserNotesArrayInput<TCollabTextKey extends string> {
  pagination: RelayArrayPaginationInput<ObjectId>;
  userNotes: Omit<UserNotesArrayLookupInput<TCollabTextKey>, 'fieldPath'>;
}


export type RelayPaginateUserNotesArrayOuput<
  TUserNoteLookup,
  TGroupExpressionOutput = Record<string, never>,
> = UserNotesArrayLookupOutput<RelayArrayPaginationOutput<TUserNoteLookup>, TGroupExpressionOutput>;

export default function relayPaginateUserNotesArray<TCollabTextKey extends string>(
  input: RelayPaginateUserNotesArrayInput<TCollabTextKey>
) {
  return [
    {
      $project: {
        paginations: relayArrayPagination(input.pagination),
      },
    },
    ...userNotesArrayLookup({
      ...input.userNotes,
      fieldPath: 'paginations.array',
      groupExpression: {
        ...input.userNotes.groupExpression,
        userNotesSizes: { $first: '$paginations.sizes' },
      },
    }),
    {
      $set: {
        _userNotes: '$userNotes',
      },
    },
    {
      $unset: 'userNotes',
    },
    {
      $set: {
        userNotes: {
          array: '$_userNotes',
          sizes: '$userNotesSizes',
        },
      },
    },
    {
      $unset: ['_userNotes', 'userNotesSizes'],
    },
  ];
}
