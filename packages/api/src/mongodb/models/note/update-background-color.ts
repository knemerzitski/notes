import { ClientSession, ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../collections';
import { MongoReadonlyDeep } from '../../types';

interface UpdateBackgroundColorParams {
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
   * New user note preferences background color
   */
  backgroundColor: string;
}

/**
 * Update specific user note background color
 */
export function updateBackgroundColor({
  mongoDB,
  noteUser,
  noteId,
  backgroundColor,
}: UpdateBackgroundColorParams) {
  const noteUserArrayFilter = 'noteUser';
  return mongoDB.collections.notes.updateOne(
    {
      _id: noteId,
    },
    {
      $set: {
        [`users.$[${noteUserArrayFilter}].preferences.backgroundColor`]: backgroundColor,
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
