import 'source-map-support/register';
import { APIGatewayProxyHandler } from 'aws-lambda';

import {
  createApolloHttpHandler,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { createLogger, Logger } from '~utils/logger';

import { GraphQLResolversContext, DynamoDBBaseGraphQLContext } from './graphql/types';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultMongoDBContext,
} from './parameters';
import {
  createApiGraphQLContext,
  createBaseGraphQLContext,
} from './services/graphql/context';
import { createIsCurrentConnection } from './services/handlers/handlers';

export interface CreateApolloHttpHandlerDefaultParamsOptions {
  override?: {
    logger?: Logger;
    createMongoDBContext?: typeof createDefaultMongoDBContext;
    createGraphQLParams?: typeof createDefaultGraphQLParams;
    createDynamoDBParams?: typeof createDefaultDynamoDBParams;
    createApiGatewayParams?: typeof createDefaultApiGatewayParams;
  };
}

export function createApolloHttpHandlerParams(
  options?: CreateApolloHttpHandlerDefaultParamsOptions
): CreateApolloHttpHandlerParams<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>,
  DynamoDBBaseGraphQLContext
> {
  const name = 'apollo-http-handler';
  const logger = options?.override?.logger ?? createLogger(name);

  let mongoDB: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  return {
    logger,
    createIsCurrentConnection,
    graphQL:
      options?.override?.createGraphQLParams?.(logger) ??
      createDefaultGraphQLParams(logger),
    apiGateway:
      options?.override?.createApiGatewayParams?.(logger) ??
      createDefaultApiGatewayParams(logger),
    dynamoDB:
      options?.override?.createDynamoDBParams?.(logger) ??
      createDefaultDynamoDBParams(logger),

    async createGraphQLContext(_ctx, event) {
      if (!mongoDB) {
        mongoDB = await (options?.override?.createMongoDBContext?.(logger) ??
          createDefaultMongoDBContext(logger));
      }

      const apiContext = createApiGraphQLContext({
        mongoDB,
        options: createDefaultApiOptions(),
      });

      const baseContext = await createBaseGraphQLContext({
        headers: event.headers,
        sessionParams: {
          loader: apiContext.mongoDB.loaders.session,
          sessionDurationConfig: apiContext.options?.sessions?.user,
        },
      });

      return {
        ...baseContext,
        ...apiContext,
        subscribe: () => {
          throw new Error(`Subscribe should never be called in ${name}`);
        },
        denySubscription: () => {
          throw new Error(`denySubscription should never be called in ${name}`);
        },
      };
    },
  };
}

export const handler: APIGatewayProxyHandler = createApolloHttpHandler(
  createApolloHttpHandlerParams()
);
