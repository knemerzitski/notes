import { verifyCredentialToken } from '../../../../auth/google/oauth2';
import type { MutationResolvers } from '../../../../graphql/types.generated';
import {
  createClientCookiesInsertNewSession,
  headersSetCookieUpdateSessions,
  parseAuthFromHeaders,
} from '../../auth-context';

export const signIn: NonNullable<MutationResolvers['signIn']> = async (
  _parent,
  { input },
  { mongoose, session, request, response }
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
    expireAt: session.newExpireAt(),
  });

  await newSession.save();
  const cookieKey = existingUser.publicId;
  const cookieId = newSession.cookieId;

  const auth = await parseAuthFromHeaders(request.headers, mongoose.model.Session);
  const sessionCookie = createClientCookiesInsertNewSession(auth, cookieKey, cookieId);

  headersSetCookieUpdateSessions(response.multiValueHeaders, sessionCookie);

  return {
    currentSessionId: sessionCookie.currentUserPublicId,
    userInfo: {
      profile: {
        displayName: existingUser.profile.displayName,
      },
    },
    authProviderUserInfo: {
      id: googleUserId,
      email: tmpGoogleEmail,
    },
  };
};
