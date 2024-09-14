import {
  QueryableUserLoader,
  UserNotFoundQueryLoaderError,
} from '../../mongodb/loaders/user';
import { DBUserSchema } from '../../mongodb/schema/user';

interface FindUserByGoogleUserIdParams {
  googleUserId: string;
  loader: QueryableUserLoader;
}

export async function findUserByGoogleUserId({
  googleUserId,
  loader,
}: FindUserByGoogleUserIdParams) {
  try {
    return await loader.load(
      {
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
      },
      {
        resultType: 'validated',
      }
    );
  } catch (err) {
    if (err instanceof UserNotFoundQueryLoaderError) {
      return null;
    }
    throw err;
  }
}

export interface PrimeNewGoogleUserParams {
  newUser: DBUserSchema;
  loader: QueryableUserLoader;
}

export function primeNewGoogleUser({ newUser, loader }: PrimeNewGoogleUserParams) {
  loader.prime(
    {
      id: {
        userId: newUser._id,
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
      result: {
        _id: newUser._id,
        profile: newUser.profile,
        thirdParty: newUser.thirdParty,
      },
      type: 'validated',
    },
    {
      clearCache: true,
    }
  );
}
