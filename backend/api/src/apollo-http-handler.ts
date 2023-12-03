import { APIGatewayProxyHandler } from 'aws-lambda';
import { Connection } from 'mongoose';

import { createLogger } from '~common/logger';
import {
  createApolloHttpHandler,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';

import {
  createDefaultApiGatewayParams,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultMongooseContext,
} from './handler-params';
import { BaseGraphQLContext, GraphQLResolversContext } from './schema/context';
import { newExpireAt, tryRefreshExpireAt } from './schema/session/expire';

export function createDefaultParams(): CreateApolloHttpHandlerParams<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
  BaseGraphQLContext
> {
  const logger = createLogger('apollo-websocket-handler');

  let mongoose: Connection | undefined;

  return {
    logger,
    graphQL: createDefaultGraphQLParams(logger),
    async createGraphQLContext() {
      if (!mongoose) {
        mongoose = (await createDefaultMongooseContext(logger)).connection;
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
