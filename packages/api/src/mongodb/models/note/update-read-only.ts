import { ClientSession, ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../collections';
import { MongoReadonlyDeep } from '../../types';

interface UpdateReadOnlyParams {
  mongoDB: {
    session?: ClientSession;
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
  };
  noteUser: MongoReadonlyDeep<{ _id: ObjectId }>;
  /**
   * Note to update
   */
  noteId: ObjectId;
  /**
   * New user note readOnly
   */
  readOnly: boolean;
}

/**
 * Update specific user note background color
 */
export function updateReadOnly({
  mongoDB,
  noteUser,
  noteId,
  readOnly,
}: UpdateReadOnlyParams) {
  const noteUserArrayFilter = 'noteUser';
  return mongoDB.collections.notes.updateOne(
    {
      _id: noteId,
    },
    {
      $set: {
        [`users.$[${noteUserArrayFilter}].readOnly`]: readOnly,
      },
    },
    {
      arrayFilters: [
        {
          [`${noteUserArrayFilter}._id`]: noteUser._id,
        },
      ],
      session: mongoDB.session,
    }
  );
}
