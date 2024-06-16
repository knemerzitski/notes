import { Document } from 'mongodb';

import userNoteLookup, { UserNoteLookupInput } from './userNoteLookup';

export interface UserNotesArrayLookupInput<TCollabTextKey extends string> {
  /**
   * Field path to array of UserNote._id
   */
  fieldPath: string;
  userNoteCollctionName: string;
  /**
   * Array is unwind at the start and group back togeter at the end.
   */
  groupExpression?: Document;

  userNoteLookupInput?: UserNoteLookupInput<TCollabTextKey>;
}

export type UserNotesArrayLookupOutput<
  TUserNotesLookupOutput,
  TGroupExpressionOutput = Record<string, never>,
> = {
  userNotes: TUserNotesLookupOutput;
} & TGroupExpressionOutput;

export default function userNotesArrayLookup<TCollabTextKey extends string>({
  fieldPath,
  userNoteCollctionName,
  userNoteLookupInput,
  groupExpression,
}: UserNotesArrayLookupInput<TCollabTextKey>): Document[] {
  return [
    {
      $unwind: {
        path: `$${fieldPath}`,
        includeArrayIndex: 'index',
      },
    },
    {
      $lookup: {
        from: userNoteCollctionName,
        foreignField: '_id',
        localField: fieldPath,
        as: 'userNote',
        pipeline: userNoteLookupInput ? userNoteLookup(userNoteLookupInput) : undefined,
      },
    },
    {
      $set: {
        userNote: { $arrayElemAt: ['$userNote', 0] },
      },
    },
    {
      $group: {
        ...groupExpression,
        _id: '$_id',
        userNotes: { $push: '$userNote' },
      },
    },
    { $unset: ['_id'] },
  ];
}
