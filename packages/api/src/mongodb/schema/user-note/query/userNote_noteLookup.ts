import { Document } from 'mongodb';

import { NoteSchema } from '../../note/note';

export interface UserNote_NoteLookupParams {
  /**
   * Note collection name
   */
  collectionName: string;
  /**
   * Pipeline to be applied on Note
   */
  pipeline?: Document[];
}

export interface UserNote_NoteLookup<T = NoteSchema> {
  note: T;
}

/**
 * Replaces UserNote.note with actual Note document
 */
export default function userNote_noteLookup({
  collectionName,
  pipeline = [],
}: UserNote_NoteLookupParams) {
  return [
    {
      $lookup: {
        from: collectionName,
        foreignField: '_id',
        localField: 'note._id',
        as: 'note',
        pipeline,
      },
    },
    {
      $set: {
        note: {
          $arrayElemAt: ['$note', 0],
        },
      },
    },
  ];
}
