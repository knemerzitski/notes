import type { MutationResolvers } from '../../../types.generated';
import { UserSchema } from '../../../user/mongoose';
import { SessionSchema } from '../../mongoose';

const SECURE_SET_COOKIE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

export const signIn: NonNullable<MutationResolvers['signIn']> = async (
  _parent,
  _arg,
  { auth: auth, mongoose, response }
) => {
  // TODO verify token by using auth provdier
  const googleUserId = 'test-google-id';

  const UserModel = mongoose.model<UserSchema>('User');
  const SessionModel = mongoose.model<SessionSchema>('Session');

  let existingUser = await UserModel.findOne({
    thirdParty: {
      google: {
        id: googleUserId,
      },
    },
  });

  if (!existingUser) {
    // Create new first time signIn user
    const newUser = new UserModel({
      thirdParty: {
        google: {
          id: googleUserId,
        },
      },
    });
    existingUser = await newUser.save();
  }

  const newSession = new SessionModel({ userId: existingUser._id });
  await newSession.save();
  const sessionId = newSession._id.toString();

  const sessions = auth ? [...auth.sessions, sessionId] : [sessionId];
  const activeSessionIndex = sessions.length - 1;

  // Remember session information in http-only cookie
  if (!('Set-Cookie' in response.multiValueHeaders)) {
    response.multiValueHeaders['Set-Cookie'] = [];
  }
  response.multiValueHeaders['Set-Cookie'].push(
    `Sessions=${sessions.join(',')}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
  );
  response.multiValueHeaders['Set-Cookie'].push(
    `ActiveSessionIndex=${activeSessionIndex}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
  );

  return true;
};
