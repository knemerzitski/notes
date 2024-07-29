import { Document } from 'mongodb';

import { UserNoteSchema } from '../../user-note/user-note';

export interface User_UserNoteLookupParams {
  /**
   * UserNote collection name
   */
  collectionName: string;
  /**
   * Path to UserNote._id
   */
  fieldPath: string;
  /**
   * Pipeline to be applied on UserNote
   */
  pipeline?: Document[];
}

export type User_UserNoteLookup<T = UserNoteSchema> = T;

/**
 * Replaces {@link fieldPath} with actual UserNote document
 */
export default function user_userNoteLookup({
  collectionName,
  fieldPath,
  pipeline = [],
}: User_UserNoteLookupParams) {
  return [
    {
      $lookup: {
        from: collectionName,
        foreignField: '_id',
        localField: fieldPath,
        as: fieldPath,
        pipeline,
      },
    },
    {
      $set: {
        [fieldPath]: {
          $arrayElemAt: [`$${fieldPath}`, 0],
        },
      },
    },
  ];
}
