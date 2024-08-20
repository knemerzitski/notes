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

  let mongoDB: Awaited<ReturnType<typeof createDefaultMongoDBContext>> | undefined;

  return {
    logger,
    graphQL: createDefaultGraphQLParams(logger),
    async createGraphQLContext(_ctx, event) {
      if (!mongoDB) {
        mongoDB = await createDefaultMongoDBContext(logger);
      }

      const mongoDBLoaders = createMongoDBLoaders(mongoDB);

      const cookies = Cookies.parseFromHeaders(event.headers);

      const apiOptions = createDefaultApiOptions();

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
          ...mongoDB,
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
    dynamoDB: createDefaultDynamoDBParams(logger),
    apiGateway: createDefaultApiGatewayParams(logger),
  };
}

export const handler: APIGatewayProxyHandler =
  createApolloHttpHandler(createDefaultParams());
