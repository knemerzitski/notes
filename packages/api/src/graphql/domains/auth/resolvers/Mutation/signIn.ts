import { ObjectId } from 'mongodb';

import { wrapRetryOnError } from '../../../../../../../utils/src/retry-on-error';

import {
  retryOnMongoError,
  MongoErrorCodes,
} from '../../../../../mongodb/utils/retry-on-mongo-error';
import { verifyCredentialToken } from '../../../../../services/auth/google/oauth2';
import { findUserByGoogleUserId } from '../../../../../services/user/find-user-by-google-user-id';
import { insertUserWithGoogleUser } from '../../../../../services/user/insert-user-with-google-user';
import { GraphQLResolversContext } from '../../../../types';
import { preExecuteObjectField } from '../../../../utils/pre-execute';
import { MutationResolvers, ResolversTypes } from '../../../types.generated';

const _signIn: NonNullable<MutationResolvers['signIn']> = async (
  _parent,
  arg,
  ctx,
  info
) => {
  const { mongoDB, services } = ctx;

  const { input } = arg;

  const googleAuthToken = input.auth.google.token;

  const {
    id: googleUserId,
    name: googleDisplayName,
    email: tmpGoogleEmail,
  } = await verifyCredentialToken(googleAuthToken);

  const [existingUser] = await Promise.all([
    findUserByGoogleUserId({
      googleUserId,
      loader: mongoDB.loaders.user,
    }),
    // Pre fetch required user fields while checking if user exists
    preExecuteObjectField<
      GraphQLResolversContext,
      Partial<ResolversTypes['SignInPayload']>
    >(
      {
        __typename: 'JustSignedInResult',
        signedInUser: {
          query: mongoDB.loaders.user.createQueryFn(
            {
              googleUserId,
            },
            {
              mapQuery: (query) => ({
                _id: 1,
                ...query,
              }),
            }
          ),
        },
      },
      ctx,
      info
    ),
  ]);

  let signedInUserId: ObjectId;
  if (!existingUser) {
    const newUser = await insertUserWithGoogleUser({
      id: googleUserId,
      displayName: googleDisplayName,
      mongoDB,
    });

    signedInUserId = newUser._id;
  } else {
    signedInUserId = existingUser._id;
  }

  if (await services.auth.isAuthenticated(signedInUserId)) {
    await services.auth.assertAuthenticated(signedInUserId);

    return {
      __typename: 'AlreadySignedInResult',
      signedInUser: {
        userId: signedInUserId,
        query: mongoDB.loaders.user.createQueryFn({
          userId: signedInUserId,
        }),
      },
      availableUsers: services.auth.getAvailableUserIds().map((userId) => ({
        userId,
        query: mongoDB.loaders.user.createQueryFn({
          userId,
        }),
      })),
    };
  }

  await services.auth.addUser(signedInUserId);

  return {
    __typename: 'JustSignedInResult',
    signedInUser: {
      userId: signedInUserId,
      query: mongoDB.loaders.user.createQueryFn({
        userId: signedInUserId,
      }),
    },
    availableUsers: services.auth.getAvailableUserIds().map((userId) => ({
      userId,
      query: mongoDB.loaders.user.createQueryFn({
        userId,
      }),
    })),
    authProviderUser: {
      __typename: 'GoogleAuthProviderUser',
      id: googleUserId,
      email: tmpGoogleEmail,
    },
  };
};

export const signIn = wrapRetryOnError(
  _signIn,
  retryOnMongoError({
    maxRetries: 3,
    codes: [MongoErrorCodes.DUPLICATE_KEY_E11000],
  })
);
