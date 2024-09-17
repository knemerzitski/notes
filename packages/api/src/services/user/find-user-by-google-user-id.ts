import {
  QueryableUserLoader,
  UserNotFoundQueryLoaderError,
} from '../../mongodb/loaders/user/loader';

interface FindUserByGoogleUserIdParams {
  googleUserId: string;
  loader: QueryableUserLoader;
}

export async function findUserByGoogleUserId({
  googleUserId,
  loader,
}: FindUserByGoogleUserIdParams) {
  try {
    return await loader.load({
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
  } catch (err) {
    if (err instanceof UserNotFoundQueryLoaderError) {
      return null;
    }
    throw err;
  }
}
