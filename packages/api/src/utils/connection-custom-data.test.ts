import { ObjectId } from 'mongodb';
import { it } from 'vitest';

import { AuthenticatedContextsModel } from '../models/auth/authenticated-contexts';
import { CurrentUserModel } from '../models/auth/current-user';
import { SessionsCookieModel } from '../models/http/sessions-cookie';

import {
  parseConnectionCustomData,
  serializeConnectionCustomData,
} from './connection-custom-data';

it('serializeConnectionCustomData without errors', () => {
  serializeConnectionCustomData({
    authenticatedContexts: new AuthenticatedContextsModel(),
    sessionsCookie: new SessionsCookieModel(),
    currentUser: new CurrentUserModel(),
  });
});

it('parseConnectionCustomData without errors', () => {
  const serializedValue = serializeConnectionCustomData({
    authenticatedContexts: new AuthenticatedContextsModel(),
    sessionsCookie: new SessionsCookieModel(),
    currentUser: new CurrentUserModel(new ObjectId()),
  });
  parseConnectionCustomData(serializedValue);
});
