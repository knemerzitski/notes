import { Collection, ObjectId } from 'mongodb';
import { UserSchema } from '../../mongodb/schema/user/user';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';

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
