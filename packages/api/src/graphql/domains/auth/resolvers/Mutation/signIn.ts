import { ObjectId } from 'mongodb';
import { wrapRetryOnErrorAsync } from '~utils/wrap-retry-on-error';

import {
  retryOnMongoError,
  MongoErrorCodes,
} from '../../../../../mongodb/utils/retry-on-mongo-error';
import { verifyCredentialToken } from '../../../../../services/auth/google/oauth2';
import { isAuthenticated } from '../../../../../services/auth/is-authenticated';
import { SessionDuration } from '../../../../../services/session/duration';
import { insertSession } from '../../../../../services/session/insert-session';
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
  const { mongoDB, cookies, response } = ctx;

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

  if (isAuthenticated(ctx.auth)) {
    const currentUserId = ctx.auth.session.userId;
    if (currentUserId.equals(signedInUserId)) {
      return {
        __typename: 'AlreadySignedInResult',
        signedInUser: {
          query: mongoDB.loaders.user.createQueryFn({
            userId: currentUserId,
          }),
        },
        availableUserIds: cookies.getAvailableSessionUserIds(),
      };
    }
  }

  const newSession = await insertSession({
    mongoDB,
    userId: signedInUserId,
    duration: new SessionDuration(
      ctx.options?.sessions?.user ?? {
        duration: 1000 * 60 * 60 * 24 * 14, // 14 days,
        refreshThreshold: 0.5, // 7 days
      }
    ),
  });

  cookies.setSession(signedInUserId, newSession.cookieId);
  cookies.putCookiesToHeaders(response.multiValueHeaders);

  // Set auth after sign in
  ctx.auth = {
    session: newSession,
  };

  return {
    __typename: 'JustSignedInResult',
    signedInUser: {
      query: mongoDB.loaders.user.createQueryFn({
        userId: signedInUserId,
      }),
    },
    availableUserIds: cookies.getAvailableSessionUserIds(),
    authProviderUser: {
      __typename: 'GoogleAuthProviderUser',
      id: googleUserId,
      email: tmpGoogleEmail,
    },
  };
};

export const signIn = wrapRetryOnErrorAsync(
  _signIn,
  retryOnMongoError({
    maxRetries: 3,
    codes: [MongoErrorCodes.DUPLICATE_KEY_E11000],
  })
);
