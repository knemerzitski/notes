import { ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { findNoteUser, updateNoteBackgroundColor } from './note';
import { NoteNotFoundServiceError } from './errors';
import { QueryableNoteLoader } from '../../mongodb/loaders/queryable-note-loader';
import { MongoReadonlyDeep } from '../../mongodb/types';

interface UpdateNoteBackgroundColorParams {
  mongoDB: {
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
}

export async function updateNoteBackgroundColorWithLoader({
  mongoDB,
  userId,
  noteId,
  backgroundColor,
}: UpdateNoteBackgroundColorParams) {
  const note = await mongoDB.loaders.note.load(
    {
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
    },
    {
      resultType: 'validated',
    }
  );
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

  await updateNoteBackgroundColor({
    collection: mongoDB.collections.notes,
    userId,
    noteId,
    backgroundColor,
  });

  return {
    type: 'success',
    note,
  };
}

export interface PrimeNewBackgroundColorParams<
  T extends MongoReadonlyDeep<
    { _id: ObjectId; preferences?: { backgroundColor?: string } }[]
  >,
> {
  userId: ObjectId;
  noteId: ObjectId;
  noteUsers: T;
  newBackgroundColor: string;
  loader: QueryableNoteLoader;
}

export function primeNewBackgroundColor<
  T extends MongoReadonlyDeep<
    { _id: ObjectId; preferences?: { backgroundColor?: string } }[]
  >,
>({
  userId,
  noteId,
  noteUsers,
  newBackgroundColor,
  loader,
}: PrimeNewBackgroundColorParams<T>) {
  loader.prime(
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
      result: {
        users: noteUsers.map((noteUser) => {
          const isOtherUser = !userId.equals(noteUser._id);
          if (isOtherUser) {
            return noteUser;
          }
          return {
            ...noteUser,
            preferences: {
              ...noteUser.preferences,
              backgroundColor: newBackgroundColor,
            },
          };
        }),
      },
      type: 'validated',
    },
    { clearCache: true }
  );
}
