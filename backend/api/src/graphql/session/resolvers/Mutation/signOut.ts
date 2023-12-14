import type { MutationResolvers } from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';

import { SECURE_SET_COOKIE } from './signIn';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  _arg,
  { auth, mongoose: { model }, response }
) => {
  assertAuthenticated(auth);

  await model.Session.findByIdAndDelete(auth.session._id);

  if (!('Set-Cookie' in response.multiValueHeaders)) {
    response.multiValueHeaders['Set-Cookie'] = [];
  }

  const cookieNewSessions = auth.cookie.sessions.filter(
    (cookieID) => cookieID !== auth.session.cookieId
  );
  if (cookieNewSessions.length > 0) {
    // Keep Using default account
    const cookieActiveSessionIndex = 0;
    response.multiValueHeaders['Set-Cookie'].push(
      `Sessions=${cookieNewSessions.join(
        ','
      )}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
    );
    response.multiValueHeaders['Set-Cookie'].push(
      `ActiveSessionIndex=${cookieActiveSessionIndex}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`
    );
    return {
      signedOut: true,
      activeSessionIndex: cookieActiveSessionIndex,
    };
  }

  // Signed out from all accounts
  response.multiValueHeaders['Set-Cookie'].push(
    `Sessions=; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  response.multiValueHeaders['Set-Cookie'].push(
    `ActiveSessionIndex=; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );

  return {
    signedOut: true,
  };
};
