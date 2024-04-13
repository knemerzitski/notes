import { ObjectId } from 'mongodb';
import relayArrayPagination, { RelayArrayPaginationInput } from './relayArrayPagination';
import userNotesArrayLookup, {
  UserNotesArrayLookupInput,
  UserNotesArrayLookupOutput,
} from '../lookup/userNotesArrayLookup';
import mapObject from 'map-obj';
import relayMultiArrayPaginationConcat, {
  RelayMultiArrayPaginationConcatOutput,
} from './relayMultiArrayPaginationConcat';

export interface RelayPaginateUserNotesArrayInput<
  TCollabTextKey extends string,
  TArrayKey extends string,
> {
  pagination: Partial<
    Record<
      TArrayKey,
      Omit<RelayArrayPaginationInput<ObjectId>, 'arrayFieldPath' | 'searchExpression'>
    >
  >;
  userNotes: Omit<UserNotesArrayLookupInput<TCollabTextKey>, 'fieldPath'>;
}

export type RelayPaginateUserNotesArrayOuput<
  TUserNoteLookup,
  TGroupExpressionOutput = Record<string, never>,
> = UserNotesArrayLookupOutput<
  RelayMultiArrayPaginationConcatOutput<TUserNoteLookup>,
  TGroupExpressionOutput
>;

export default function relayPaginateUserNotesArray<
  TCollabTextKey extends string,
  TArrayKey extends string,
>(input: RelayPaginateUserNotesArrayInput<TCollabTextKey, TArrayKey>) {
  return [
    {
      $project: {
        ...mapObject(input.pagination, (key, pagination) => {
          return [
            `paginations.${key}`,
            relayArrayPagination({
              arrayFieldPath: key,
              ...pagination,
            }),
          ];
        }),
      },
    },
    {
      $project: {
        paginations: relayMultiArrayPaginationConcat({
          paths: Object.keys(input.pagination).map((key) => `paginations.${key}`),
        }),
      },
    },
    ...userNotesArrayLookup({
      ...input.userNotes,
      fieldPath: 'paginations.array',
      groupExpression: {
        ...input.userNotes.groupExpression,
        userNotesMultiSizes: { $first: '$paginations.multiSizes' },
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
          multiSizes: '$userNotesMultiSizes',
        },
      },
    },
    {
      $unset: ['_userNotes', 'userNotesMultiSizes'],
    },
  ];
}
