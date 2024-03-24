import { APIGatewayProxyHandler } from 'aws-lambda';

import {
  createApolloHttpHandler,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { createLogger } from '~utils/logger';

import { parseAuthFromHeaders } from './graphql/auth-context';
import { GraphQLResolversContext, DynamoDBBaseGraphQLContext } from './graphql/context';
import CookiesContext from './graphql/cookies-context';
import { newExpireAt, tryRefreshExpireAt } from './graphql/session-expiration';
import {
  createDefaultApiGatewayParams,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultIsCurrentConnection,
  createDefaultMongooseContext,
} from './handler-params';

export function createDefaultParams(): CreateApolloHttpHandlerParams<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
  DynamoDBBaseGraphQLContext
> {
  const logger = createLogger('apollo-websocket-handler');

  let mongoose: Awaited<ReturnType<typeof createDefaultMongooseContext>> | undefined;

  return {
    logger,
    graphQL: createDefaultGraphQLParams(logger),
    async createGraphQLContext(_ctx, event) {
      if (!mongoose) {
        mongoose = await createDefaultMongooseContext(logger);
      }

      const cookiesCtx = CookiesContext.parseFromHeaders(event.headers);

      const authCtx = await parseAuthFromHeaders(
        event.headers,
        cookiesCtx,
        mongoose.model.Session
      );

      return {
        cookies: cookiesCtx,
        auth: authCtx,
        mongoose,
        session: {
          newExpireAt,
          tryRefreshExpireAt,
        },
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
    dynamoDB: createDefaultDynamoDBParams(logger),
    apiGateway: createDefaultApiGatewayParams(logger),
  };
}

export const handler: APIGatewayProxyHandler =
  createApolloHttpHandler(createDefaultParams());
