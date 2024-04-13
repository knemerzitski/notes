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

interface GroupExpression {
  sizes: Exclude<RelayArrayPaginationOutput<ObjectId>['sizes'], undefined> | null;
}

export type RelayPaginateUserNotesArrayOuput<
  TUserNoteLookup,
  TGroupExpressionOutput = Record<string, never>,
> = UserNotesArrayLookupOutput<TUserNoteLookup, TGroupExpressionOutput> & GroupExpression;

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
        sizes: { $first: '$paginations.sizes' },
      },
    }),
  ];
}
