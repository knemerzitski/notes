import { ObjectId } from 'mongodb';

import type { MutationResolvers } from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  createCookieDeleteByKey,
  headersSetCookieDeleteSessions,
  headersSetCookieUpdateSessions,
} from '../../auth-context';

export const signOut: NonNullable<MutationResolvers['signOut']> = async (
  _parent,
  _arg,
  { auth, mongoose: { model }, response }
) => {
  assertAuthenticated(auth);

  await model.Session.findByIdAndDelete(ObjectId.createFromBase64(auth.session._id));

  const sessionCookie = createCookieDeleteByKey(auth.cookie, auth.cookie.currentKey);

  if (sessionCookie) {
    headersSetCookieUpdateSessions(response.multiValueHeaders, sessionCookie);

    return {
      signedOut: true,
      currentSessionKey: sessionCookie.currentKey,
    };
  } else {
    headersSetCookieDeleteSessions(response.multiValueHeaders);
    return {
      signedOut: true,
    };
  }
};
