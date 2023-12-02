import type { MutationResolvers } from '../../../types.generated';
import { SessionSchema } from '../../mongoose';

import { SECURE_SET_COOKIE } from './signIn';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  _arg,
  { auth, mongoose, response }
) => {
  if (!auth) return -1;

  const SessionModel = mongoose.model<SessionSchema>('Session');

  await SessionModel.findByIdAndDelete(auth.sessionId);

  if (!('Set-Cookie' in response.multiValueHeaders)) {
    response.multiValueHeaders['Set-Cookie'] = [];
  }

  const newSessions = auth.sessions.filter((id) => id !== auth.sessionId);
  if (newSessions.length > 0) {
    // Keep Using default account
    const activeSessionIndex = 0;
    response.multiValueHeaders['Set-Cookie'].push(
      `Sessions=${newSessions.join(',')}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
    );
    response.multiValueHeaders['Set-Cookie'].push(
      `ActiveSessionIndex=${activeSessionIndex}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
    );
  } else {
    // Signed out from all accounts
    response.multiValueHeaders['Set-Cookie'].push(
      `Sessions=; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
    response.multiValueHeaders['Set-Cookie'].push(
      `ActiveSessionIndex=; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
  }

  return auth.sessionIndex;
};
