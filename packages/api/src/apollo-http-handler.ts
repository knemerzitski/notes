import 'source-map-support/register.js';
import { APIGatewayProxyHandler } from 'aws-lambda';

import { CustomHeaderName } from '../../api-app-shared/src/custom-headers';

import {
  createApolloHttpHandler,
  CreateApolloHttpHandlerParams,
} from '../../lambda-graphql/src/apollo-http-handler';

import { createLogger, Logger } from '../../utils/src/logging';

import { ApolloHttpHandlerGraphQLResolversContext } from './graphql/types';
import { AuthenticatedContextsModel } from './models/auth/authenticated-contexts';
import { createMongoDBLoaders } from './mongodb/loaders';
import { objectIdToStr } from './mongodb/utils/objectid';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultMongoDBContext,
} from './parameters';
import { CookiesMongoDBDynamoDBAuthenticationService } from './services/auth/auth-service';
import { Cookies } from './services/http/cookies';
import { SessionsCookie } from './services/http/sessions-cookie';
import { parseCookiesFromHeaders } from './services/http/utils/cookies';
import { ConnectionsAuthenticationServiceCache } from './utils/auth-cache';
import { serializeConnectionCustomData } from './utils/connection-custom-data';

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

  const authLogger = logger.extend('auth');

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
    async requestDidStart({ event, context }) {
      const apiOptions = createDefaultApiOptions();
      const requestWsConnectionId = event.headers[CustomHeaderName.WS_CONNECTION_ID];

      // MongoDB
      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }
      const mongoDBContext = {
        ...mongoDB,
        loaders: createMongoDBLoaders(mongoDB),
      };

      // Cache Auth service for every possible connection (mainly needed during subscription publish)
      const connectionsAuthCache = new ConnectionsAuthenticationServiceCache({
        connections: context.loaders.connections,
        mongoDB: mongoDBContext,
        options: apiOptions,
      });

      // Cookies, Sessions
      const cookies = new Cookies(parseCookiesFromHeaders(event.headers));
      const currentRequestSessionsCookie = new SessionsCookie(
        {
          cookies,
        },
        {
          key: apiOptions.sessions.cookieKey,
        }
      );
      currentRequestSessionsCookie.updateModelFromCookies();

      // Auth model
      const currentRequestAuthModel = new AuthenticatedContextsModel();

      const ongoingPromises: Promise<unknown>[] = [];

      // When request auth changes, update connection one too
      currentRequestAuthModel.eventBus.on('*', ({ type, event }) => {
        if (!requestWsConnectionId) {
          return;
        }

        const auth = event.auth;

        ongoingPromises.push(
          connectionsAuthCache.getCustomData(requestWsConnectionId).then((value) => {
            if (!value) {
              return;
            }

            const model = value.authenticatedContexts;
            const key = objectIdToStr(auth.session.userId);

            if (type === 'set') {
              model.set(key, auth);
            } else {
              // deleted
              model.delete(key);
            }
          })
        );
      });
      // when this changes, also update other one auth context..

      // Auth service
      const currentRequestAuthService = new CookiesMongoDBDynamoDBAuthenticationService(
        {
          mongoDB: mongoDBContext,
          sessionsCookie: currentRequestSessionsCookie,
          options: apiOptions,
          logger: authLogger,
        },
        currentRequestAuthModel
      );

      return {
        createIsCurrentConnection: () => {
          if (!requestWsConnectionId) {
            return;
          }
          return (connectionId: string) => requestWsConnectionId === connectionId;
        },
        createGraphQLContext: async (
          graphQLContextConnectionId = requestWsConnectionId
        ) => {
          const authService =
            !graphQLContextConnectionId ||
            graphQLContextConnectionId === requestWsConnectionId
              ? currentRequestAuthService
              : await connectionsAuthCache.get(graphQLContextConnectionId);

          return {
            options: apiOptions,
            mongoDB: mongoDBContext,
            services: {
              auth: authService,
            },
            connectionId: graphQLContextConnectionId,
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

          // Wait for previous Promise events to be done before checking `changedCustomDatas`
          await Promise.allSettled(ongoingPromises);

          await Promise.allSettled(
            connectionsAuthCache.changedCustomDatas.map(
              async ({ connectionId, customData }) => {
                await context.models.connections.update(
                  {
                    id: connectionId,
                  },
                  {
                    customData: serializeConnectionCustomData(customData),
                  }
                );
                logger.debug('connectionUpdatedCustomData', {
                  connectionId,
                  customData,
                });
              }
            )
          );
        },
      };
    },
  };
}

export const handler: APIGatewayProxyHandler = createApolloHttpHandler(
  createApolloHttpHandlerDefaultParams()
);
