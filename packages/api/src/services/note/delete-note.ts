import { MongoClient, ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import {
  NoteNotFoundServiceError,
  NoteUserNotFoundServiceError,
  NoteUserUnauthorizedServiceError,
} from './errors';
import { findNoteUser, isNoteUserOlder, isNoteUserOldest } from './note';
import { deleteNote as model_deleteNote } from '../../mongodb/models/note/delete-note';
import { deleteUserFromNote as model_deleteUserFromNote } from '../../mongodb/models/note/delete-user-from-note';

interface DeleteNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * Who is deleting the note
   */
  scopeUserId: ObjectId;
  /**
   * User whose note is deleted
   */
  targetUserId: ObjectId;
  /**
   * Note to be deleted
   */
  noteId: ObjectId;
}

export function deleteNote({
  mongoDB,
  scopeUserId,
  targetUserId,
  noteId,
}: DeleteNoteParams) {
  return mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      const note = await mongoDB.loaders.note.load(
        {
          id: {
            userId: scopeUserId,
            noteId,
          },
          query: {
            _id: 1,
            users: {
              _id: 1,
              createdAt: 1,
              categoryName: 1,
            },
          },
        },
        {
          resultType: 'validated',
          session,
        }
      );

      const scopeNoteUser = findNoteUser(scopeUserId, note);
      if (!scopeNoteUser) {
        throw new NoteNotFoundServiceError(noteId);
      }
      const targetNoteUser = findNoteUser(targetUserId, note);
      if (!targetNoteUser) {
        throw new NoteUserNotFoundServiceError(targetUserId, noteId);
      }

      if (!isNoteUserOlder(scopeNoteUser, targetNoteUser)) {
        throw new NoteUserUnauthorizedServiceError(
          scopeNoteUser._id,
          targetNoteUser._id,
          'Delete user from note'
        );
      }

      const isTargetUserOldest = isNoteUserOldest(targetNoteUser, note);
      if (isTargetUserOldest) {
        // Target user is oldest: delete note completely
        await model_deleteNote({
          mongoDB: {
            session,
            collections: mongoDB.collections,
          },
          allNoteUsers: note.users,
          noteId,
        });
        return {
          type: 'deleted_completely' as const,
          note,
        };
      } else {
        // Target user is not oldest: unlink note for self
        await model_deleteUserFromNote({
          mongoDB: {
            session,
            collections: mongoDB.collections,
          },
          noteId,
          noteUser: targetNoteUser,
        });
        return {
          type: 'unlinked_target_user' as const,
          note,
        };
      }
    })
  );
}
