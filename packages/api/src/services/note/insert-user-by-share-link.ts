import { MongoClient, ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { NoteByShareLinkNotFoundServiceError } from './errors';
import { findNoteUser } from './note';
import { insertNoteUser } from '../../mongodb/models/note/insert-note-user';
import { NoteUserSchema } from '../../mongodb/schema/note-user';
import { withTransaction } from '../../mongodb/utils/with-transaction';

export async function insertUserByShareLink({
  mongoDB,
  userId,
  shareLinkId,
  categoryName,
}: {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    loaders: Pick<MongoDBLoaders, 'noteByShareLink'>;
  };
  /**
   * User who is trying to access the note
   */
  userId: ObjectId;
  /**
   * Target Note.shareLinks._id
   */
  shareLinkId: ObjectId;
  /**
   * Category where to put the note
   */
  categoryName: string;
}) {
  return withTransaction(
    mongoDB.client,
    async ({ runSingleOperation, session }) => {
      const note = await mongoDB.loaders.noteByShareLink.load(
        {
          id: {
            shareLinkId,
          },
          query: {
            _id: 1,
            users: {
              _id: 1,
              categoryName: 1,
              createdAt: 1,
              readOnly: 1,
            },
            shareLinks: {
              _id: 1,
              expireAccessCount: 1,
              expireAt: 1,
              permissions: {
                user: {
                  readOnly: 1,
                },
              },
            },
          },
        },
        {
          session,
        }
      );

      const now = Date.now();
      const shareLink = note.shareLinks?.find(({ _id, expireAccessCount, expireAt }) => {
        if (!shareLinkId.equals(_id)) return false;

        if (expireAccessCount != null && expireAccessCount <= 0) {
          return false;
        }

        if (expireAt && expireAt.getTime() <= now) {
          return false;
        }

        return true;
      });

      if (!shareLink) {
        throw new NoteByShareLinkNotFoundServiceError(shareLinkId);
      }

      const noteUser = findNoteUser(userId, note);
      if (noteUser) {
        return {
          type: 'already_user' as const,
          noteUser,
          note,
        };
      }

      const newNoteUser: NoteUserSchema = {
        _id: userId,
        categoryName,
        createdAt: new Date(),
        readOnly: shareLink.permissions?.user?.readOnly ?? false,
      };

      await insertNoteUser({
        mongoDB: {
          ...mongoDB,
          runSingleOperation,
        },
        noteId: note._id,
        noteUser: newNoteUser,
        shareLink:
          shareLink.expireAccessCount != null
            ? {
                _id: shareLink._id,
                expireAccessCount: shareLink.expireAccessCount - 1,
              }
            : undefined,
      });

      mongoDB.loaders.noteByShareLink.prime(
        {
          id: {
            shareLinkId,
          },
        },
        {
          _id: note._id,
          users: [...note.users, newNoteUser],
        }
      );

      return {
        type: 'success' as const,
        noteUser: newNoteUser,
        note,
      };
    },
    {
      skipAwaitFirstOperation: true,
    }
  );
}