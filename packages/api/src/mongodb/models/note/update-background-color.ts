import { ClientSession, ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../collections';

interface UpdateBackgroundColorParams {
  mongoDB: {
    session?: ClientSession;
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
  };
  /**
   * User who can access the note
   */
  userId: ObjectId;
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
  userId,
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
          [`${noteUserArrayFilter}._id`]: userId,
        },
      ],
      session: mongoDB.session,
    }
  );
}
