import { GraphQLError } from 'graphql';

import type { MutationResolvers } from '../../../../graphql/types.generated';
import { getSessionUserFromHeaders } from '../../parse-cookies';

export const SECURE_SET_COOKIE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

export const signIn: NonNullable<MutationResolvers['signIn']> = async (
  _parent,
  { input },
  { mongoose, session, request, response }
) => {
  const { model } = mongoose;

  // TODO verify token by using auth provider
  const googleUserId = input.credentials.token;
  if (!googleUserId) {
    throw new GraphQLError('No token provided', {
      extensions: {
        code: 'EMPTY_TOKEN',
      },
    });
  }

  // TODO use firstName as displayname
  const displayName = 'Test User';

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
        displayName,
      },
    });
    existingUser = await newUser.save();
  }

  const newSession = new model.Session({
    userId: existingUser._id,
    expireAt: session.newExpireAt(),
  });

  await newSession.save();
  const cookieId = newSession.cookieId;

  // TODO test getSessionUserFromHeaders separately and mock it in the meantime?
  const auth = await getSessionUserFromHeaders(mongoose, request.headers);

  const cookieSessions = auth ? [...auth.cookie.sessions, cookieId] : [cookieId];
  const cookieCurrentSessionIndex = cookieSessions.length - 1;

  // Remember session information in http-only cookie
  if (!('Set-Cookie' in response.multiValueHeaders)) {
    response.multiValueHeaders['Set-Cookie'] = [];
  }
  response.multiValueHeaders['Set-Cookie'].push(
    `Sessions=${cookieSessions.join(',')}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
  );
  response.multiValueHeaders['Set-Cookie'].push(
    `CurrentSessionIndex=${cookieCurrentSessionIndex}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
  );

  return {
    sessionIndex: cookieCurrentSessionIndex,
    userInfo: {
      profile: {
        displayName: existingUser.profile.displayName,
      },
    },
  };
};
