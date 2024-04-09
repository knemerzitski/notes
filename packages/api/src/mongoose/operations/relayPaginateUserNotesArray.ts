import { ObjectId } from 'mongodb';
import relayArrayPagination, {
  RelayArrayPaginationInput,
  RelayArrayPaginationOutput,
} from './relayArrayPagination';
import userNotesArrayLookup, {
  UserNotesArrayLookupInput,
  UserNotesArrayLookupOutput,
} from './lookup/userNotesArrayLookup';
import { UserNoteLookupOutput } from './lookup/userNoteLookup';

export interface RelayPaginateUserNotesArrayInput<TCollabTextKey extends string> {
  pagination: RelayArrayPaginationInput<ObjectId>;
  userNotes: Omit<UserNotesArrayLookupInput<TCollabTextKey>, 'fieldPath'>;
}

interface GroupExpression {
  sizes: Exclude<
    RelayArrayPaginationOutput<ObjectId>['paginations']['sizes'],
    undefined
  > | null;
}

export type RelayPaginateUserNotesArrayOuput<
  TCollabTextKey extends string,
  TGroupExpressionOutput = Record<string, never>,
  TUserNoteLookupOutput = UserNoteLookupOutput<TCollabTextKey>,
> = UserNotesArrayLookupOutput<
  TCollabTextKey,
  TGroupExpressionOutput,
  TUserNoteLookupOutput
> &
  GroupExpression;

export default function relayPaginateUserNotesArray<TCollabTextKey extends string>(
  input: RelayPaginateUserNotesArrayInput<TCollabTextKey>
) {
  return [
    {
      $project: relayArrayPagination(input.pagination),
    },
    ...userNotesArrayLookup({
      ...input.userNotes,
      fieldPath: 'paginations.array',
      groupExpression: {
        ...input.userNotes.groupExpression,
        sizes: { $first: '$paginations.sizes' },
      },
    }),
  ];
}
