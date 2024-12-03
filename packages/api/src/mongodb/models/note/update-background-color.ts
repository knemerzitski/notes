import { ObjectId } from 'mongodb';

import { MongoDBCollections, CollectionName } from '../../collections';
import { MongoReadonlyDeep } from '../../types';
import { TransactionContext } from '../../utils/with-transaction';

interface UpdateBackgroundColorParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
    runSingleOperation?: TransactionContext['runSingleOperation'];
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
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  const noteUserArrayFilter = 'noteUser';
  return runSingleOperation((session) =>
    mongoDB.collections.notes.updateOne(
      {
        _id: noteId,
      },
      {
        $set: {
          [`users.$[${noteUserArrayFilter}].preferences.backgroundColor`]:
            backgroundColor,
        },
      },
      {
        arrayFilters: [
          {
            [`${noteUserArrayFilter}._id`]: noteUser._id,
          },
        ],
        session,
      }
    )
  );
}
