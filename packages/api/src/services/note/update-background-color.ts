import { ObjectId } from 'mongodb';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';

import { updateBackgroundColor as model_updateBackgroundColor } from '../../mongodb/models/note/update-background-color';

import { NoteNotFoundServiceError } from './errors';
import { findNoteUser } from './note';

interface UpdateBackgroundColorParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  /**
   * User who can access the note
   */
  userId: ObjectId;
  /**
   * Note to update
   */
  noteId: ObjectId;
  /**
   * New background color
   */
  backgroundColor: string;
}

export async function updateBackgroundColor({
  mongoDB,
  userId,
  noteId,
  backgroundColor,
}: UpdateBackgroundColorParams) {
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
  if (!noteUser) {
    throw new NoteNotFoundServiceError(noteId);
  }

  if (noteUser.preferences?.backgroundColor === backgroundColor) {
    return {
      type: 'already_background_color',
      note,
    };
  }

  await model_updateBackgroundColor({
    mongoDB,
    noteUser,
    noteId,
    backgroundColor,
  });

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
      users: note.users.map((noteUser) => {
        const isOtherUser = !userId.equals(noteUser._id);
        if (isOtherUser) {
          return noteUser;
        }
        return {
          ...noteUser,
          preferences: {
            ...noteUser.preferences,
            backgroundColor: backgroundColor,
          },
        };
      }),
    }
  );

  return {
    type: 'success',
    note,
  };
}
