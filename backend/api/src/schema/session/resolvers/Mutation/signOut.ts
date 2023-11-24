import type { MutationResolvers } from '../../../types.generated';
import { SessionSchema } from '../../mongoose';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  _arg,
  { auth: auth, mongoose, response }
) => {
  if (!auth) return true;

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
      `Sessions=${newSessions.join(',')}; HttpOnly; Secure; SameSite=Strict`
    );
    response.multiValueHeaders['Set-Cookie'].push(
      `ActiveSessionIndex=${activeSessionIndex}; HttpOnly; Secure; SameSite=Strict`
    );
  } else {
    // Signed out from all accounts
    response.multiValueHeaders['Set-Cookie'].push(
      `Session=; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
    response.multiValueHeaders['Set-Cookie'].push(
      `ActiveSessionIndex=; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
  }

  return true;
};
