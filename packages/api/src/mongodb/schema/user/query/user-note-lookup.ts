import { Document } from 'mongodb';

import { NoteSchema } from '../../note/note';

export interface User_NoteLookupParams {
  /**
   * Note collection name
   */
  collectionName: string;
  /**
   * Path to Note._id
   */
  fieldPath: string;
  /**
   * Pipeline to be applied on Note
   */
  pipeline?: Document[];
}

export type User_NoteLookup<T = NoteSchema> = T;

/**
 * Replaces {@link fieldPath} with actual UserNote document
 */
export function user_noteLookup({
  collectionName,
  fieldPath,
  pipeline = [],
}: User_NoteLookupParams) {
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
