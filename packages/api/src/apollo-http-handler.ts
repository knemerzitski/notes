import 'source-map-support/register';
import { APIGatewayProxyHandler } from 'aws-lambda';

import {
  createApolloHttpHandler,
  CreateApolloHttpHandlerParams,
} from '~lambda-graphql/apollo-http-handler';
import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { createLogger } from '~utils/logger';

import { GraphQLResolversContext, DynamoDBBaseGraphQLContext } from './graphql/context';
import {
  createDefaultApiGatewayParams,
  createDefaultApiOptions,
  createDefaultDynamoDBParams,
  createDefaultGraphQLParams,
  createDefaultIsCurrentConnection,
  createDefaultMongoDBContext,
} from './handler-params';
import { createMongoDBLoaders } from './mongodb/loaders';
import { Cookies } from './services/auth/cookies';
import { parseAuthenticationContextFromHeaders } from './services/auth/auth';

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

      const mongoDbLoaders = createMongoDBLoaders(mongodb);

      const cookies = Cookies.parseFromHeaders(event.headers);

      const apiOptions = createDefaultApiOptions();

      const auth = await parseAuthenticationContextFromHeaders({
        headers: event.headers,
        cookies,
        sessionParams: {
          loader: mongoDbLoaders.session,
          sessionDurationConfig: apiOptions.sessions?.user,
        },
      });

      return {
        cookies,
        auth,
        mongodb: {
          ...mongodb,
          loaders: mongoDbLoaders,
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
    dynamoDB: createDefaultDynamoDBParams(logger),
    apiGateway: createDefaultApiGatewayParams(logger),
  };
}

export const handler: APIGatewayProxyHandler =
  createApolloHttpHandler(createDefaultParams());
