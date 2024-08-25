import { Collection, ObjectId } from 'mongodb';
import { UserSchema } from '../../mongodb/schema/user';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';

/**
 * @param category Enum value NoteCategory
 * @returns MongoDB field path to notes array of ObjectIds
 */
export function getNotesArrayPath(category: string) {
  return `notes.category.${category}.order`;
}

interface FindUserByGoogleUserIdParams {
  googleUserId: string;
  loader: QueryableUserLoader;
}

export function findUserByGoogleUserId({
  googleUserId,
  loader,
}: FindUserByGoogleUserIdParams) {
  return loader.load({
    id: {
      googleUserId,
    },
    query: {
      _id: 1,
      thirdParty: {
        google: {
          id: 1,
        },
      },
    },
  });
}

export interface InsertNewUserWithGoogleUserParams {
  id: string;
  displayName: string;
  collection: Collection<UserSchema>;
}

export async function insertNewUserWithGoogleUser({
  id,
  displayName,
  collection,
}: InsertNewUserWithGoogleUserParams) {
  const newUser: UserSchema = {
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

interface PrimeUserWithGoogleUserParams {
  user: UserSchema;
  loader: QueryableUserLoader;
}

/**
 * Primes displayName in loader, cached value is overwritten
 */
export function primeUserWithGoogleUser({ user, loader }: PrimeUserWithGoogleUserParams) {
  loader.prime(
    {
      id: {
        userId: user._id,
      },
      query: {
        _id: 1,
        thirdParty: {
          google: {
            id: 1,
          },
        },
        profile: {
          displayName: 1,
        },
      },
    },
    {
      _id: user._id,
      profile: user.profile,
      thirdParty: user.thirdParty,
    },
    {
      clearCache: true,
    }
  );
}

export interface UpdateDisplayNameParams {
  userId: ObjectId;
  displayName: string;

  collection: Collection<UserSchema>;
}

/**
 * Updates displayName in database
 */
export function updateDisplayName({
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

interface LoaderPrimeDisplayNameParams {
  userId: ObjectId;
  displayName: string;

  loader: QueryableUserLoader;
}

/**
 * Primes displayName in loader, cached value is overwritten
 */
export function primeDisplayName({
  userId,
  displayName,
  loader,
}: LoaderPrimeDisplayNameParams) {
  loader.prime(
    {
      id: {
        userId,
      },
      query: {
        _id: 1,
        profile: {
          displayName: 1,
        },
      },
    },
    {
      _id: userId,
      profile: {
        displayName,
      },
    },
    { clearCache: true }
  );
}
