import { Collection, ObjectId } from 'mongodb';
import { DBNoteSchema } from '../../schema/note';

interface UpdateBackgroundColorParams {
  /**
   * Collection to update
   */
  collection: Collection<DBNoteSchema>;
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
  collection,
  userId,
  noteId,
  backgroundColor,
}: UpdateBackgroundColorParams) {
  const noteUserArrayFilter = 'noteUser';
  return collection.updateOne(
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
    }
  );
}
