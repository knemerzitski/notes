import { MongoClient, ObjectId } from 'mongodb';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { updateTrashNote as model_updateTrashNote } from '../../mongodb/models/note/update-trash-note';
import { withTransaction } from '../../mongodb/utils/with-transaction';

import { NoteNotFoundServiceError } from './errors';
import { findNoteUser } from './note';

interface UpdateTrashNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * User who can access the note
   */
  userId: ObjectId;
  /**
   * Note to trash
   */
  noteId: ObjectId;
  /**
   * How long note is kept in trash in milliseconds
   * @default 1000 * 60 * 60 * 24 * 30 = 30 days
   */
  trashDuration?: number;
  /**
   * Note is moved to this category when trashed
   */
  trashCategoryName: string;
}

/**
 * Trash note. It will be deleted after specified duration has passed.
 */
export async function updateTrashNote({
  mongoDB,
  userId,
  noteId,
  trashDuration,
  trashCategoryName,
}: UpdateTrashNoteParams) {
  return withTransaction(mongoDB.client, async ({ runSingleOperation }) => {
    const note = await runSingleOperation((session) =>
      mongoDB.loaders.note.load(
        {
          id: {
            userId,
            noteId,
          },
          query: {
            _id: 1,
            users: {
              _id: 1,
              categoryName: 1,
              trashed: {
                expireAt: 1,
                originalCategoryName: 1,
              },
            },
          },
        },
        {
          session,
        }
      )
    );

    const noteUser = findNoteUser(userId, note);
    if (!noteUser) {
      throw new NoteNotFoundServiceError(noteId);
    }

    const originalCategoryName =
      noteUser.trashed?.originalCategoryName ?? noteUser.categoryName;

    const existingExpireAt = noteUser.trashed?.expireAt;
    if (existingExpireAt != null) {
      // Return early since note is already trashed
      return {
        type: 'already_trashed' as const,
        expireAt: existingExpireAt,
        originalCategoryName,
      };
    }

    const expireAt = new Date(Date.now() + (trashDuration ?? 1000 * 60 * 60 * 24 * 30));

    await model_updateTrashNote({
      mongoDB: {
        runSingleOperation,
        collections: mongoDB.collections,
      },
      noteId,
      noteUser,
      expireAt,
      trashCategoryName,
    });

    mongoDB.loaders.note.prime(
      {
        id: {
          userId,
          noteId,
        },
        query: {
          users: {
            categoryName: 1,
            trashed: {
              expireAt: 1,
              originalCategoryName: 1,
            },
          },
        },
      },
      {
        users: note.users.map((noteUser) => {
          if (!userId.equals(noteUser._id)) {
            return noteUser;
          }

          return {
            ...noteUser,
            categoryName: trashCategoryName,
            trashed: {
              ...noteUser.trashed,
              expireAt,
              originalCategoryName: noteUser.categoryName,
            },
          };
        }),
      }
    );

    return {
      type: 'success' as const,
      originalCategoryName,
      expireAt,
    };
  });
}
