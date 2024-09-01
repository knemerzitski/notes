import { ObjectId } from 'mongodb';
import { wrapRetryOnErrorAsync } from '~utils/wrap-retry-on-error';
import {
  retryOnMongoError,
  MongoErrorCodes,
} from '../../../../../mongodb/utils/retry-on-mongo-error';
import { isAuthenticated } from '../../../../../services/auth/auth';
import { SessionDuration } from '../../../../../services/session/duration';
import { insertNewSession } from '../../../../../services/session/session';
import {
  findUserByGoogleUserId,
  insertNewUserWithGoogleUser,
} from '../../../../../services/user/user';
import { GraphQLResolversContext } from '../../../../types';
import { preExecuteObjectField } from '../../../../utils/pre-execute';
import { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { verifyCredentialToken } from '../../../../../services/auth/google/oauth2';

const _signIn: NonNullable<MutationResolvers['signIn']> = async (
  _parent,
  arg,
  ctx,
  info
) => {
  const { mongoDB, cookies, response } = ctx;

  if (isAuthenticated(ctx.auth)) {
    const currentUserId = ctx.auth.session.userId;
    return {
      __typename: 'AlreadySignedInResult',
      signedInUser: {
        query: (query) =>
          mongoDB.loaders.user.load({
            id: {
              userId: currentUserId,
            },
            query,
          }),
      },
      availableUserIds: cookies.getAvailableSessionUserIds(),
    };
  }

  const { input } = arg;

  const googleAuthToken = input.auth.token;

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
          query: (query) =>
            mongoDB.loaders.user.load({
              id: {
                googleUserId,
              },
              query: {
                _id: 1,
                ...query,
              },
            }),
        },
      },
      ctx,
      info
    ),
  ]);

  let currentUserId: ObjectId;
  if (!existingUser?._id) {
    const newUser = await insertNewUserWithGoogleUser({
      id: googleUserId,
      displayName: googleDisplayName,
      collection: mongoDB.collections.users,
      prime: {
        loader: mongoDB.loaders.user,
      },
    });
    currentUserId = newUser._id;
  } else {
    currentUserId = existingUser._id;
  }

  const newSession = await insertNewSession({
    userId: currentUserId,
    duration: new SessionDuration(
      ctx.options?.sessions?.user ?? {
        duration: 14 * 24 * 60 * 60, // 14 days,
        refreshThreshold: 0.5, // 7 days
      }
    ),
    collection: mongoDB.collections.sessions,
  });

  cookies.setSession(currentUserId, newSession.cookieId);
  cookies.putCookiesToHeaders(response.multiValueHeaders);

  // Set auth after sign in
  ctx.auth = {
    session: newSession,
  };

  return {
    __typename: 'JustSignedInResult',
    signedInUser: {
      query: (query) =>
        mongoDB.loaders.user.load({
          id: {
            userId: currentUserId,
          },
          query,
        }),
    },
    availableUserIds: cookies.getAvailableSessionUserIds(),
    authProviderUser: {
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