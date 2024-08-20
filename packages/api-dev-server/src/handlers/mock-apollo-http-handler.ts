import 'source-map-support/register';
import WebSocket from 'ws';

import {
  GraphQLResolversContext,
  DynamoDBBaseGraphQLContext,
} from '~api/graphql/context';
import {
  createDefaultApiOptions,
  createDefaultIsCurrentConnection,
} from '~api/handler-params';
import { createMongoDBLoaders } from '~api/mongodb/loaders';
import {
  createApolloHttpHandler,
  ApolloHttpGraphQLContext,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import { createLogger } from '~utils/logger';

import {
  createMockGraphQLParams,
  createMockMongoDBContext,
  createMockDynamoDBParams,
  createMockApiGatewayParams,
} from '../handler-params';
import { Cookies, parseCookiesFromHeaders } from '~api/services/auth/cookies';
import { parseAuthenticationContextFromHeaders } from '~api/services/auth/auth';

interface MockCreateApolloHttpHandlerOptions {
  mongodb?: Awaited<ReturnType<typeof createMockMongoDBContext>> | undefined;
  sockets?: Record<string, WebSocket>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mockCreateDefaultParams(
  options?: MockCreateApolloHttpHandlerOptions
): CreateApolloHttpHandlerParams<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
  DynamoDBBaseGraphQLContext
> {
  let monogDB = options?.mongodb;
  const sockets = options?.sockets;

  const logger = createLogger('mock:apollo-http-handler');

  const apiOptions = createDefaultApiOptions();

  return {
    logger,
    graphQL: createMockGraphQLParams(),
    async createGraphQLContext(_ctx, event) {
      if (!monogDB) {
        monogDB = await createMockMongoDBContext();
      }

      const mongoDBLoaders = createMongoDBLoaders(monogDB);

      const cookies = Cookies.parse(parseCookiesFromHeaders(event.headers));

      const auth = await parseAuthenticationContextFromHeaders({
        headers: event.headers,
        cookies,
        sessionParams: {
          loader: mongoDBLoaders.session,
          sessionDurationConfig: apiOptions.sessions?.user,
        },
      });

      return {
        cookies,
        auth,
        mongoDB: {
          ...monogDB,
          loaders: mongoDBLoaders,
        },
        options: apiOptions,
        subscribe: () => {
          throw new Error('Subscribe should never be called in apollo-http-handler');
        },
        denySubscription: () => {
          throw new Error(
            'denySubscription should never be called in apollo-http-handler'
          );
        },
      };
    },
    createIsCurrentConnection: createDefaultIsCurrentConnection,
    dynamoDB: createMockDynamoDBParams(),
    apiGateway: createMockApiGatewayParams(sockets),
  };
}

export const handler = createApolloHttpHandler<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
  DynamoDBBaseGraphQLContext
>(mockCreateDefaultParams());
