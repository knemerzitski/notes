import 'source-map-support/register';
import { parseAuthFromHeaders } from '~api/graphql/auth-context';
import {
  GraphQLResolversContext,
  DynamoDBBaseGraphQLContext,
} from '~api/graphql/context';
import CookiesContext, { parseCookiesFromHeaders } from '~api/graphql/cookies-context';
import {
  createDefaultDataSources,
  createDefaultApiOptions,
  createDefaultIsCurrentConnection,
} from '~api/handler-params';
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
import WebSocket from 'ws';

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
  let mongodb = options?.mongodb;
  const sockets = options?.sockets;

  const logger = createLogger('mock:apollo-http-handler');

  return {
    logger,
    graphQL: createMockGraphQLParams(),
    async createGraphQLContext(_ctx, event) {
      if (!mongodb) {
        mongodb = await createMockMongoDBContext();
      }

      const cookiesCtx = CookiesContext.parse(parseCookiesFromHeaders(event.headers));

      const authCtx = await parseAuthFromHeaders(
        event.headers,
        cookiesCtx,
        mongodb.collections
      );

      return {
        cookies: cookiesCtx,
        auth: authCtx,
        mongodb,
        datasources: createDefaultDataSources({
          notes: {
            mongodb,
          },
        }),
        options: createDefaultApiOptions(),
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
