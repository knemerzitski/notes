import { MongoClient, ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { NoteNotFoundError } from './errors';
import { findNoteUser, updateNoteBackgroundColor } from './note';

interface UpdateNoteBackgroundColorParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
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
   * New background color value
   */
  backgroundColor: string;
  /**
   * Skip priming note loader with the result
   * @default false
   */
  skipPrimeResult?: boolean;
}

export async function updateNoteBackgroundColorWithLoader({
  mongoDB,
  userId,
  noteId,
  backgroundColor,
  skipPrimeResult,
}: UpdateNoteBackgroundColorParams) {
  const note = await mongoDB.loaders.note.load({
    id: {
      userId,
      noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        preferences: {
          backgroundColor: 1,
        },
      },
    },
  });

  const noteUser = findNoteUser(userId, note);
  if (!note?._id || !noteUser) {
    throw new NoteNotFoundError(noteId);
  }

  if (noteUser.preferences?.backgroundColor === backgroundColor) {
    // Return early, backgroundColor is already correct
    return 'already_background_color';
  }

  await updateNoteBackgroundColor({
    collection: mongoDB.collections.notes,
    userId,
    noteId,
    backgroundColor,
  });

  if (!skipPrimeResult) {
    mongoDB.loaders.note.prime(
      {
        id: {
          userId,
          noteId,
        },
        query: {
          users: {
            preferences: {
              backgroundColor: 1,
            },
          },
        },
      },
      {
        users: note.users?.map((noteUser) => {
          const isOtherUser = !userId.equals(noteUser._id);
          if (isOtherUser) {
            return noteUser;
          }
          return {
            ...noteUser,
            preferences: {
              ...noteUser.preferences,
              backgroundColor,
            },
          };
        }),
      },
      { clearCache: true }
    );
  }

  return;
}
