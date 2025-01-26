import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { WebSocketHandlerParams } from '~lambda-graphql/websocket-handler';

import { WebSocketHandlerGraphQLResolversContext } from '../graphql/types';
import { AuthenticatedContextsModel } from '../models/auth/authenticated-contexts';
import { CurrentUserModel } from '../models/auth/current-user';

import { SessionsCookieModel } from '../models/http/sessions-cookie';
import { strToObjectId } from '../mongodb/utils/objectid';
import { createDefaultApiOptions } from '../parameters';
import { Cookies } from '../services/http/cookies';
import { SessionsCookie } from '../services/http/sessions-cookie';
import { parseCookiesFromHeaders } from '../services/http/utils/parse-cookies-from-headers';

import { serializeConnectionCustomData } from './connection-custom-data';

/**
 * Read `CustomHeaderName.USER_ID` and store it in DynamoDB `customData.currentUser`
 * @param param0
 * @returns
 */
export const onConnect: WebSocketHandlerParams<WebSocketHandlerGraphQLResolversContext>['onConnect'] =
  function ({ event, connection }) {
    const headers = event.headers ?? {};

    const cookies = new Cookies(parseCookiesFromHeaders(headers));

    const apiOptions = createDefaultApiOptions();

    const sessionsCookieModel = new SessionsCookieModel();
    const sessionsCookie = new SessionsCookie(
      {
        cookies,
        model: sessionsCookieModel,
      },
      {
        key: apiOptions.sessions?.cookieKey,
      }
    );
    sessionsCookie.updateModelFromCookies();

    connection.customData = serializeConnectionCustomData({
      sessionsCookie: sessionsCookieModel,
      currentUser: new CurrentUserModel(strToObjectId(headers[CustomHeaderName.USER_ID])),
      authenticatedContexts: new AuthenticatedContextsModel(),
    });
  };
