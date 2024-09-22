import { MongoClient, ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { NoteNotFoundServiceError, NoteUnauthorizedServiceError } from './errors';
import { findNoteUser } from './note';
import { insertShareLink as model_insertShareLink } from '../../mongodb/models/note/insert-share-link';
import { ShareNoteLinkSchema } from '../../mongodb/schema/share-note-link';
import { NoteSchema } from '../../mongodb/schema/note';

export async function insertShareLink({
  mongoDB,
  userId,
  noteId,
  readOnly = false,
}: {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * User who is creating the share link
   */
  userId: ObjectId;
  /**
   * Target note
   */
  noteId: ObjectId;
  /**
   * Created share link read-only or not
   * @default false
   */
  readOnly?: boolean;
}) {
  const note = await mongoDB.loaders.note.load({
    id: {
      userId,
      noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        isOwner: 1,
      },
      shareLinks: {
        _id: 1,
        expireAccessCount: 1,
        expireAt: 1,
      },
    },
  });

  const noteUser = findNoteUser(userId, note);
  if (!noteUser) {
    throw new NoteNotFoundServiceError(noteId);
  }

  const isOwner = noteUser.isOwner;
  if (!isOwner) {
    throw new NoteUnauthorizedServiceError(noteUser._id, 'Insert note share link');
  }

  const now = Date.now();

  const shareLink = note.shareLinks?.find(({ expireAccessCount, expireAt }) => {
    if (expireAccessCount != null && expireAccessCount <= 0) {
      return false;
    }

    if (expireAt && expireAt.getTime() <= now) {
      return false;
    }

    return true;
  });

  if (shareLink) {
    return {
      type: 'already_share_link' as const,
      shareLink,
      note,
    };
  }

  const newShareLink: ShareNoteLinkSchema = {
    _id: new ObjectId(),
    creatorUserId: userId,
    permissions: {
      user: {
        readOnly,
      },
    },
  };

  await model_insertShareLink({
    mongoDB,
    noteId,
    shareLink: newShareLink,
  });

  mongoDB.loaders.note.prime(
    {
      id: {
        userId,
        noteId,
      },
    },
    {
      _id: note._id,
      shareLinks: [...(note.shareLinks ?? []), newShareLink],
    },
    {
      valueToQueryOptions: {
        fillStruct: NoteSchema,
      },
    }
  );

  return {
    type: 'success' as const,
    shareLink: newShareLink,
    note,
  };
}
