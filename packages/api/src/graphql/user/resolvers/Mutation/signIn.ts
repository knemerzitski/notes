import { verifyCredentialToken } from '../../../../auth/google/oauth2';
import { newExpireAt } from '../../../session-expiration';

import type { MutationResolvers } from './../../../types.generated';

export const signIn: NonNullable<MutationResolvers['signIn']> = async (
  _parent,
  { input },
  { mongoose, response, cookies }
) => {
  const { model } = mongoose;

  const googleAuthToken = input.credentials.token;

  const {
    id: googleUserId,
    name: googleDisplayName,
    email: tmpGoogleEmail,
  } = await verifyCredentialToken(googleAuthToken);

  let existingUser = await model.User.findOne({
    thirdParty: {
      google: {
        id: googleUserId,
      },
    },
  });

  if (!existingUser) {
    // Insert new user from Google
    const newUser = new model.User({
      thirdParty: {
        google: {
          id: googleUserId,
        },
      },
      profile: {
        displayName: googleDisplayName,
      },
    });
    existingUser = await newUser.save();
  }

  const newSession = new model.Session({
    userId: existingUser._id,
    expireAt: newExpireAt(),
  });

  await newSession.save();

  cookies.setSession(existingUser.publicId, newSession.cookieId);
  cookies.setCookieHeadersUpdate(response.multiValueHeaders);

  return {
    user: {
      id: existingUser.publicId,
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
