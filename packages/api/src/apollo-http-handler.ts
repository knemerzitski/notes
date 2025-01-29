import 'source-map-support/register.js';
import { APIGatewayProxyHandler } from 'aws-lambda';

import { CustomHeaderName } from '~api-app-shared/custom-headers';
import {
  createApolloHttpHandler,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import { Connection } from '~lambda-graphql/dynamodb/models/connection';
import { createLogger, Logger } from '~utils/logging';

import { ApolloHttpHandlerGraphQLResolversContext } from './graphql/types';
import { AuthenticatedContextsModel } from './models/auth/authenticated-contexts';
import { createMongoDBLoaders } from './mongodb/loaders';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultMongoDBContext,
} from './parameters';
import { CookiesMongoDBDynamoDBAuthenticationService } from './services/auth/auth-service';
import { trackAuthServiceModel } from './services/auth/utils/track-auth-service-model';
import { Cookies } from './services/http/cookies';
import { SessionsCookie } from './services/http/sessions-cookie';
import { parseCookiesFromHeaders } from './services/http/utils/parse-cookies-from-headers';
import {
  ConnectionCustomData,
  parseConnectionCustomData,
  serializeConnectionCustomData,
} from './utils/connection-custom-data';

export interface CreateApolloHttpHandlerDefaultParamsOptions {
  override?: {
    logger?: Logger;
    createMongoDBContext?: typeof createDefaultMongoDBContext;
    createGraphQLParams?: typeof createDefaultGraphQLParams;
    createDynamoDBParams?: typeof createDefaultDynamoDBParams;
    createApiGatewayParams?: typeof createDefaultApiGatewayParams;
  };
}

export function createApolloHttpHandlerDefaultParams(
  options?: CreateApolloHttpHandlerDefaultParamsOptions
): CreateApolloHttpHandlerParams<ApolloHttpHandlerGraphQLResolversContext> {
  const name = 'apollo-http-handler';
  const logger = options?.override?.logger ?? createLogger(name);

  let mongoDB: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  return {
    logger,
    graphQL:
      options?.override?.createGraphQLParams?.(logger) ??
      createDefaultGraphQLParams(logger),
    apiGateway:
      options?.override?.createApiGatewayParams?.(logger) ??
      createDefaultApiGatewayParams(logger),
    dynamoDB:
      options?.override?.createDynamoDBParams?.(logger) ??
      createDefaultDynamoDBParams(logger),
    requestDidStart({ event, context }) {
      const wsConnectionId = event.headers[CustomHeaderName.WS_CONNECTION_ID];

      const apiOptions = createDefaultApiOptions();

      // Cookies, Sessions
      const cookies = new Cookies(parseCookiesFromHeaders(event.headers));
      const sessionsCookie = new SessionsCookie(
        {
          cookies,
        },
        {
          key: apiOptions.sessions?.cookieKey,
        }
      );
      sessionsCookie.updateModelFromCookies();

      // Auth model
      const authModel = new AuthenticatedContextsModel();

      // When auth model is modified, match change in websocket connection
      let ws:
        | {
            connection: Connection;
            customData: ConnectionCustomData;
          }
        | undefined;
      const { promises: waitAuthModelTrackPromise } = trackAuthServiceModel({
        sourceModel: authModel,
        getTargetModel: async () => {
          if (!wsConnectionId) {
            return;
          }

          if (!ws) {
            const connection = await context.models.connections.get({
              id: wsConnectionId,
            });
            if (!connection) {
              return;
            }

            ws = {
              connection,
              customData: parseConnectionCustomData(connection.customData),
            };
          }

          return ws.customData.authenticatedContexts;
        },
      });

      return {
        createIsCurrentConnection: () => {
          if (!wsConnectionId) {
            return;
          }
          return (connectionId: string) => wsConnectionId === connectionId;
        },
        async createGraphQLContext() {
          // MongoDB
          if (!mongoDB) {
            mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
              createDefaultMongoDBContext(logger));
          }
          const mongoDBLoaders = createMongoDBLoaders(mongoDB);

          // Auth Service
          const authService = new CookiesMongoDBDynamoDBAuthenticationService(
            {
              mongoDB: {
                ...mongoDB,
                loaders: mongoDBLoaders,
              },
              sessionsCookie,
            },
            authModel
          );

          return {
            options: apiOptions,
            mongoDB: {
              ...mongoDB,
              loaders: mongoDBLoaders,
            },
            services: {
              auth: authService,
            },
            connectionId: wsConnectionId,
          };
        },
        async willSendResponse(response) {
          if (cookies.isModified) {
            let setCookieArr = response.multiValueHeaders['set-cookie'];
            if (!setCookieArr) {
              setCookieArr = [];
              response.multiValueHeaders['set-cookie'] = setCookieArr;
            }

            setCookieArr.push(...cookies.getMultiValueHeadersSetCookies());
          }

          if (ws) {
            // Persist auth changes in DynamoDB connection custom data
            await waitAuthModelTrackPromise();

            await context.models.connections.update(
              {
                id: ws.connection.id,
              },
              {
                customData: serializeConnectionCustomData(ws.customData),
              }
            );
          }
        },
      };
    },
  };
}

export const handler: APIGatewayProxyHandler = createApolloHttpHandler(
  createApolloHttpHandlerDefaultParams()
);
