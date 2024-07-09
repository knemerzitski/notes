import mapObject from 'map-obj';
import { ObjectId, WithId } from 'mongodb';

import { verifyCredentialToken } from '../../../../auth/google/oauth2';
import { CollectionName } from '../../../../mongodb/collections';
import { sessionDefaultValues } from '../../../../mongodb/schema/session/sessions';
import { UserSchema } from '../../../../mongodb/schema/user';
import { sessionExpiration } from '../../../../session-expiration/mongodb-user-session';

import { NoteCategory, type MutationResolvers } from './../../../types.generated';

export const signIn: NonNullable<MutationResolvers['signIn']> = async (
  _parent,
  { input },
  ctx
) => {
  const {
    mongodb: { collections },
    cookies,
    response,
  } = ctx;

  const googleAuthToken = input.credentials.token;

  const {
    id: googleUserId,
    name: googleDisplayName,
    email: tmpGoogleEmail,
  } = await verifyCredentialToken(googleAuthToken);

  let existingUser = await collections[CollectionName.USERS].findOne<
    WithId<Pick<UserSchema, 'profile'>>
  >(
    {
      thirdParty: {
        google: {
          id: googleUserId,
        },
      },
    },
    {
      projection: {
        profile: 1,
      },
    }
  );

  if (!existingUser) {
    // New user insertion
    const newUser: UserSchema = {
      _id: new ObjectId(),
      thirdParty: {
        google: {
          id: googleUserId,
        },
      },
      profile: {
        displayName: googleDisplayName,
      },
      notes: {
        category: mapObject(NoteCategory, (_key, categoryName) => [
          categoryName,
          {
            order: [],
          },
        ]),
      },
    };
    await collections[CollectionName.USERS].insertOne(newUser);

    existingUser = {
      _id: newUser._id,
      profile: newUser.profile,
    };
  }

  const newSession = {
    _id: new ObjectId(),
    userId: existingUser._id,
    expireAt: sessionExpiration.newExpireAtDate(),
    cookieId: sessionDefaultValues.cookieId(),
  };
  await collections[CollectionName.SESSIONS].insertOne(newSession);

  const userId = existingUser._id.toString('base64');

  cookies.setSession(userId, newSession.cookieId);
  cookies.setCookieHeadersUpdate(response.multiValueHeaders);

  return {
    user: {
      id: userId,
      profile: {
        displayName: existingUser.profile.displayName,
      },
    },
    authProviderUser: {
      id: googleUserId,
      email: tmpGoogleEmail,
    },
  };
};
