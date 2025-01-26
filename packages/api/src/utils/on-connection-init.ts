import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { WebSocketHandlerParams } from '~lambda-graphql/websocket-handler';

import { WebSocketHandlerGraphQLResolversContext } from '../graphql/types';
import { CurrentUserModel } from '../models/auth/current-user';
import { strToObjectId } from '../mongodb/utils/objectid';

import {
  parseConnectionCustomData,
  serializeConnectionCustomData,
} from './connection-custom-data';

/**
 * Read `CustomHeaderName.USER_ID` and store it in DynamoDB `customData.currentUser`
 * @param param0
 * @returns
 */
export const onConnectionInit: WebSocketHandlerParams<WebSocketHandlerGraphQLResolversContext>['onConnectionInit'] =
  async function ({ message, context, event }) {
    const payload = message.payload;
    if (!payload) return;

    const anyHeaders = payload.headers;
    if (!anyHeaders || typeof anyHeaders !== 'object') return;

    const headers = Object.fromEntries(
      Object.entries(anyHeaders).map(([key, value]) => [key, String(value)])
    );

    const connection = await context.models.connections.get({
      id: event.requestContext.connectionId,
    });
    if (!connection) {
      throw new Error('Missing connection record in DB');
    }

    const customData = parseConnectionCustomData(connection.customData);
    customData.currentUser = new CurrentUserModel(
      strToObjectId(headers[CustomHeaderName.USER_ID])
    );

    await context.models.connections.update(
      {
        id: connection.id,
      },
      {
        customData: serializeConnectionCustomData(customData),
      }
    );
  };
