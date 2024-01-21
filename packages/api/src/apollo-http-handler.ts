import { APIGatewayProxyHandler } from 'aws-lambda';

import {
  createApolloHttpHandler,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { createLogger } from '~utils/logger';

import { BaseGraphQLContext, GraphQLResolversContext } from './graphql/context';
import { newExpireAt, tryRefreshExpireAt } from './graphql/session/expire';
import {
  createDefaultApiGatewayParams,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultMongooseContext,
} from './handler-params';

export function createDefaultParams(): CreateApolloHttpHandlerParams<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
  BaseGraphQLContext
> {
  const logger = createLogger('apollo-websocket-handler');

  let mongoose: Awaited<ReturnType<typeof createDefaultMongooseContext>> | undefined;

  return {
    logger,
    graphQL: createDefaultGraphQLParams(logger),
    async createGraphQLContext() {
      if (!mongoose) {
        mongoose = await createDefaultMongooseContext(logger);
      }

      return {
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
    dynamoDB: createDefaultDynamoDBParams(logger),
    apiGateway: createDefaultApiGatewayParams(logger),
  };
}

export const handler: APIGatewayProxyHandler =
  createApolloHttpHandler(createDefaultParams());
