import 'source-map-support/register.js';
import { APIGatewayProxyHandler } from 'aws-lambda';

import { CustomHeaderName } from '~api-app-shared/custom-headers';
import {
  createApolloHttpHandler,
  CreateApolloHttpHandlerParams,
  ApolloHttpGraphQLContext,
} from '~lambda-graphql/apollo-http-handler';
import { createLogger, Logger } from '~utils/logging';

import { createApiGraphQLContext, createBaseGraphQLContext } from './graphql/context';
import { GraphQLResolversContext, ApiGraphQLContext } from './graphql/types';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultMongoDBContext,
} from './parameters';
import { createIsCurrentConnection } from './utils/handlers';

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
): CreateApolloHttpHandlerParams<
  Omit<GraphQLResolversContext, keyof ApolloHttpGraphQLContext>
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

      const apiContext: ApiGraphQLContext = {
        ...createApiGraphQLContext({
          mongoDB,
          options: createDefaultApiOptions(),
        }),
        connectionId: event.headers[CustomHeaderName.WS_CONNECTION_ID],
      };

      const baseContext = await createBaseGraphQLContext({
        headers: event.headers,
        ctx: apiContext,
      });

      return {
        ...baseContext,
        ...apiContext,
        subscribe: () => {
          throw new Error(`Subscribe should never be called in ${name}`);
        },
      };
    },
  };
}

export const handler: APIGatewayProxyHandler = createApolloHttpHandler(
  createApolloHttpHandlerDefaultParams()
);
