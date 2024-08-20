import { Collection, ObjectId } from 'mongodb';
import { UserSchema } from '../../mongodb/schema/user/user';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';

interface DBUpdateDisplayNameParams {
  userId: ObjectId;
  displayName: string;

  collection: Collection<UserSchema>;
}

/**
 * Updates displayName in database
 */
export function dbUpdateDisplayName({
  userId,
  displayName,
  collection,
}: DBUpdateDisplayNameParams) {
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
export function loaderPrimeDisplayName({
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
        profile: {
          displayName: 1,
        },
      },
    },
    {
      profile: {
        displayName,
      },
    },
    { clearCache: true }
  );
}
