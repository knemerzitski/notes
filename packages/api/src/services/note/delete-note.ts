import { MongoClient, ObjectId } from 'mongodb';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';

import { deleteNote as model_deleteNote } from '../../mongodb/models/note/delete-note';
import { deleteUserFromNote as model_deleteUserFromNote } from '../../mongodb/models/note/delete-user-from-note';
import { withTransaction } from '../../mongodb/utils/with-transaction';

import {
  NoteNotFoundServiceError,
  NoteUserNotFoundServiceError,
  NoteUserUnauthorizedServiceError,
} from './errors';
import { findNoteUser, noteOwnersCount } from './note';

interface DeleteNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<
      MongoDBCollections,
      CollectionName.NOTES | CollectionName.USERS | CollectionName.COLLAB_RECORDS
    >;
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
  return withTransaction(mongoDB.client, async ({ runSingleOperation }) => {
    const note = await runSingleOperation((session) =>
      mongoDB.loaders.note.load(
        {
          id: {
            userId: scopeUserId,
            noteId,
          },
          query: {
            _id: 1,
            users: {
              _id: 1,
              isOwner: 1,
              categoryName: 1,
            },
          },
        },
        {
          session,
        }
      )
    );

    const scopeNoteUser = findNoteUser(scopeUserId, note);
    if (!scopeNoteUser) {
      throw new NoteNotFoundServiceError(noteId);
    }
    const targetNoteUser = findNoteUser(targetUserId, note);
    if (!targetNoteUser) {
      throw new NoteUserNotFoundServiceError(targetUserId, noteId);
    }

    const isSelfDelete = scopeNoteUser._id.equals(targetNoteUser._id);
    const isOwner = scopeNoteUser.isOwner;
    const isDeletingOtherUser = !isSelfDelete;

    if (!isOwner && isDeletingOtherUser) {
      throw new NoteUserUnauthorizedServiceError(
        scopeNoteUser._id,
        targetNoteUser._id,
        'Delete user from note'
      );
    }

    const isOnlyOwner = noteOwnersCount(note) <= 1;
    if (isSelfDelete && isOwner && isOnlyOwner) {
      // Target user is only owner of the note: delete note completely
      await model_deleteNote({
        mongoDB: {
          runSingleOperation,
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
      // Target user is not: only unlink note
      await model_deleteUserFromNote({
        mongoDB: {
          runSingleOperation,
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
  });
}
