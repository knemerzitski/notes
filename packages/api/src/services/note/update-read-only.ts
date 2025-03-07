import { MongoClient, ObjectId } from 'mongodb';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';

import { updateReadOnly as model_updateReadOnly } from '../../mongodb/models/note/update-read-only';

import {
  NoteNotFoundServiceError,
  NoteUserNotFoundServiceError,
  NoteUserUnauthorizedServiceError,
} from './errors';
import { findNoteUser } from './note';

interface UpdateReadOnlyParams {
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
  /**
   * New note user read-only value
   */
  readOnly: boolean;
}

export async function updateReadOnly({
  mongoDB,
  scopeUserId,
  targetUserId,
  noteId,
  readOnly,
}: UpdateReadOnlyParams) {
  const note = await mongoDB.loaders.note.load({
    id: {
      userId: scopeUserId,
      noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        isOwner: 1,
        readOnly: 1,
      },
    },
  });

  const scopeNoteUser = findNoteUser(scopeUserId, note);
  if (!scopeNoteUser) {
    throw new NoteNotFoundServiceError(noteId);
  }

  const targetNoteUser = findNoteUser(targetUserId, note);
  if (!targetNoteUser) {
    throw new NoteUserNotFoundServiceError(targetUserId, noteId);
  }

  const isOwner = scopeNoteUser.isOwner;
  if (!isOwner) {
    throw new NoteUserUnauthorizedServiceError(
      scopeNoteUser._id,
      targetNoteUser._id,
      'Update note user readOnly'
    );
  }

  if (targetNoteUser.readOnly === readOnly) {
    return {
      type: 'already_read_only' as const,
      note,
    };
  }

  await model_updateReadOnly({
    mongoDB,
    noteId,
    noteUser: targetNoteUser,
    readOnly,
  });

  mongoDB.loaders.note.prime(
    {
      id: {
        userId: scopeUserId,
        noteId,
      },
      query: {
        users: {
          _id: 1,
          readOnly: 1,
        },
      },
    },
    {
      users: note.users.map((noteUser) => {
        const isOtherUser = !targetUserId.equals(noteUser._id);
        if (isOtherUser) {
          return noteUser;
        }
        return {
          ...noteUser,
          readOnly,
        };
      }),
    }
  );

  return {
    type: 'success' as const,
    note,
  };
}
