import { MongoClient, ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { NoteNotFoundServiceError, NoteUnauthorizedServiceError } from './errors';
import { findNoteUser } from './note';
import { deleteShareLinks as model_deleteShareLinks } from '../../mongodb/models/note/delete-share-links';

export async function deleteShareLinks({
  mongoDB,
  userId,
  noteId,
}: {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * User who is deleting the share link
   */
  userId: ObjectId;
  /**
   * Target note
   */
  noteId: ObjectId;
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
      },
    },
  });

  const noteUser = findNoteUser(userId, note);
  if (!noteUser) {
    throw new NoteNotFoundServiceError(noteId);
  }

  const isOwner = noteUser.isOwner;
  if (!isOwner) {
    throw new NoteUnauthorizedServiceError(noteUser._id, 'Delete note share link');
  }

  const shareLinks = note.shareLinks;

  if (!shareLinks || shareLinks.length === 0) {
    return {
      type: 'already_deleted' as const,
      note,
    };
  }

  await model_deleteShareLinks({
    mongoDB,
    noteId,
  });

  return {
    type: 'success' as const,
    note,
    shareLinks: [] as typeof note.shareLinks,
  };
}
