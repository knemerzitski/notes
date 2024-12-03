import { ObjectId } from 'mongodb';

import { MongoDBCollections, CollectionName } from '../../collections';
import { DBNoteUserSchema, NoteUserSchema } from '../../schema/note-user';
import { TransactionContext } from '../../utils/with-transaction';
import { notesArrayPath } from '../user/utils/notes-array-path';

export async function insertNoteUser({
  mongoDB,
  noteId,
  noteUser,
  shareLink,
}: {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
  };
  noteId: ObjectId;
  noteUser: NoteUserSchema | DBNoteUserSchema;
  shareLink?: {
    _id: ObjectId;
    expireAccessCount: number;
  };
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  noteUser = NoteUserSchema.createRaw(noteUser);

  const shareLinkArrayFilter = 'shareLink';
  return Promise.all([
    runSingleOperation((session) =>
      mongoDB.collections.notes.updateOne(
        {
          _id: noteId,
        },
        {
          $push: {
            users: noteUser,
          },
          ...(shareLink && {
            $set: {
              [`shareLinks.$[${shareLinkArrayFilter}].expireAccessCount`]:
                shareLink.expireAccessCount,
            },
          }),
        },
        {
          ...(shareLink && {
            arrayFilters: [
              {
                [`${shareLinkArrayFilter}._id`]: shareLink._id,
              },
            ],
          }),
          session,
        }
      )
    ),
    runSingleOperation((session) =>
      mongoDB.collections.users.updateOne(
        {
          _id: noteUser._id,
        },
        {
          $push: {
            [notesArrayPath(noteUser.categoryName)]: noteId,
          },
        },
        { session }
      )
    ),
  ]);
}
