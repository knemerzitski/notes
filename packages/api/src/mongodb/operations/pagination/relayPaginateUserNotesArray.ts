import { ObjectId, Document } from 'mongodb';
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
  customProject?: Document;
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
>(input: RelayPaginateUserNotesArrayInput<TCollabTextKey, TArrayKey>): Document[] {
  const paginationKeys = Object.keys(input.pagination);

  if (paginationKeys.length > 0) {
    return [
      {
        $project: {
          ...input.customProject,
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
          ...(input.customProject
            ? Object.fromEntries(Object.keys(input.customProject).map((key) => [key, 1]))
            : {}),
          paginations: relayMultiArrayPaginationConcat({
            paths: paginationKeys.map((key) => `paginations.${key}`),
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
  } else {
    return [
      {
        $project: {
          ...input.customProject,
        },
      },
      { $unset: ['_id'] },
    ];
  }
}
