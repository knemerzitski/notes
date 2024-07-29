import 'source-map-support/register';
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
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultIsCurrentConnection,
  createDefaultMongoDBContext,
} from './handler-params';
import { createMongoDBLoaders } from './mongodb/loaders';

export function createDefaultParams(): CreateApolloHttpHandlerParams<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
  DynamoDBBaseGraphQLContext
> {
  const logger = createLogger('apollo-http-handler');

  let mongodb: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  return {
    logger,
    graphQL: createDefaultGraphQLParams(logger),
    async createGraphQLContext(_ctx, event) {
      if (!mongodb) {
        mongodb = await createDefaultMongoDBContext(logger);
      }

      const cookiesCtx = CookiesContext.parseFromHeaders(event.headers);

      const authCtx = await parseAuthFromHeaders(
        event.headers,
        cookiesCtx,
        mongodb.collections
      );

      return {
        cookies: cookiesCtx,
        auth: authCtx,
        mongodb: {
          ...mongodb,
          loaders: createMongoDBLoaders(mongodb),
        },
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
    dynamoDB: createDefaultDynamoDBParams(logger),
    apiGateway: createDefaultApiGatewayParams(logger),
  };
}

export const handler: APIGatewayProxyHandler =
  createApolloHttpHandler(createDefaultParams());
