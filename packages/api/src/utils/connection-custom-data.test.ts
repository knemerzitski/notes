import { it } from 'vitest';

import { AuthenticatedContextsModel } from '../models/auth/authenticated-contexts';
import { SessionsCookieModel } from '../models/http/sessions-cookie';

import {
  parseConnectionCustomData,
  serializeConnectionCustomData,
} from './connection-custom-data';

it('serializeConnectionCustomData without errors', () => {
  serializeConnectionCustomData({
    authenticatedContexts: new AuthenticatedContextsModel(),
    sessionsCookie: new SessionsCookieModel(),
  });
});

it('parseConnectionCustomData without errors', () => {
  const serializedValue = serializeConnectionCustomData({
    authenticatedContexts: new AuthenticatedContextsModel(),
    sessionsCookie: new SessionsCookieModel(),
  });
  parseConnectionCustomData(serializedValue);
});
