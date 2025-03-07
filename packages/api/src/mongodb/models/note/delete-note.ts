import { ObjectId } from 'mongodb';

import { CollectionName } from '../../collection-names';
import { MongoDBCollections } from '../../collections';
import { MongoReadonlyDeep } from '../../types';
import { TransactionContext } from '../../utils/with-transaction';
import { notesArrayPath } from '../user/utils/notes-array-path';

interface DeleteNoteParams {
  mongoDB: {
    collections: Pick<
      MongoDBCollections,
      CollectionName.NOTES | CollectionName.USERS | CollectionName.COLLAB_RECORDS
    >;
  } & Pick<TransactionContext, 'runSingleOperation'>;
  noteId: ObjectId;
  allNoteUsers: MongoReadonlyDeep<{ _id: ObjectId; categoryName: string }[]>;
}

export function deleteNote({ mongoDB, noteId, allNoteUsers }: DeleteNoteParams) {
  return Promise.all([
    mongoDB.runSingleOperation((session) =>
      mongoDB.collections.notes.deleteOne(
        {
          _id: noteId,
        },
        { session }
      )
    ),
    mongoDB.runSingleOperation((session) =>
      mongoDB.collections.collabRecords.deleteMany(
        {
          collabTextId: noteId,
        },
        { session }
      )
    ),
    ...(allNoteUsers.length > 0
      ? [
          mongoDB.runSingleOperation((session) =>
            mongoDB.collections.users.bulkWrite(
              allNoteUsers.map((noteUser) => ({
                updateOne: {
                  filter: {
                    _id: noteUser._id,
                  },
                  update: {
                    $pull: {
                      [notesArrayPath(noteUser.categoryName)]: noteId,
                    },
                  },
                },
              })),
              { session }
            )
          ),
        ]
      : []),
  ]);
}
