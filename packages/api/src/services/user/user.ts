import { Collection, ObjectId } from 'mongodb';
import { DBUserSchema } from '../../mongodb/schema/user';

/**
 * @param category Enum value NoteCategory
 * @returns MongoDB field path to notes array of ObjectIds
 */
export function getNotesArrayPath(category: string) {
  return `notes.category.${category}.order`;
}

export interface InsertNewUserWithGoogleUserParams {
  id: string;
  displayName: string;
  collection: Collection<DBUserSchema>;
}

export async function insertNewUserWithGoogleUser({
  id,
  displayName,
  collection,
}: InsertNewUserWithGoogleUserParams) {
  const newUser: DBUserSchema = {
    _id: new ObjectId(),
    thirdParty: {
      google: {
        id,
      },
    },
    profile: {
      displayName,
    },
    notes: {
      category: {},
    },
  };

  await collection.insertOne(newUser);

  return newUser;
}
export interface UpdateDisplayNameParams {
  userId: ObjectId;
  displayName: string;

  collection: Collection<DBUserSchema>;
}

/**
 * Updates displayName in database
 */
export async function updateDisplayName({
  userId,
  displayName,
  collection,
}: UpdateDisplayNameParams) {
  return collection.updateOne(
    {
      _id: userId,
    },
    {
      $set: {
        'profile.displayName': displayName,
      },
    }
  );
}
