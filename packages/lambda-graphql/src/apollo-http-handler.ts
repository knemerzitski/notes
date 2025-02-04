import { BaseContext, ApolloServer } from '@apollo/server';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { GraphQLSchema } from 'graphql/index.js';
import { Logger } from '~utils/logging';

import { MaybePromise } from '~utils/types';

import { lowercaseHeaderKeys } from './apigateway-proxy-event/lowercase-header-keys';
import { parseGraphQLRequestEvent } from './apigateway-proxy-event/parse-graphql-request-event';
import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDBContext } from './context/dynamodb';
import {
  ApolloGraphQLContextParams,
  createApolloGraphQLContext,
} from './context/graphql';
import { ConnectionTable } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { Publisher, createPublisher } from './pubsub/publish';
import { BaseGraphQLContext } from './type';

interface DirectParams {
  logger: Logger;
}

export interface CreateApolloHttpHandlerParams<TGraphQLContext extends BaseContext>
  extends DirectParams {
  readonly requestDidStart: (args: {
    readonly context: ApolloHttpHandlerContext;
    readonly event: APIGatewayProxyEvent;
  }) => MaybePromise<{
    readonly createGraphQLContext: () => MaybePromise<TGraphQLContext>;
    readonly createIsCurrentConnection?: () =>
      | ((connectionId: string) => boolean)
      | undefined;
    readonly willSendResponse?: (
      response: APIGatewayProxyNonNullableResult
    ) => MaybePromise<void>;
  }>;
  readonly graphQL: ApolloGraphQLContextParams<TGraphQLContext>;
  readonly dynamoDB: DynamoDBContextParams;
  readonly apiGateway: ApiGatewayContextParams;
}

type APIGatewayProxyNonNullableResult = Omit<
  APIGatewayProxyResult,
  'multiValueHeaders'
> & {
  readonly headers: NonNullable<APIGatewayProxyResult['headers']>;
  readonly multiValueHeaders: NonNullable<APIGatewayProxyResult['multiValueHeaders']>;
};

export interface ApolloHttpHandlerContext extends DirectParams {
  readonly schema: GraphQLSchema;
  readonly models: {
    readonly connections: ConnectionTable;
    readonly subscriptions: SubscriptionTable;
  };
  readonly socketApi: WebSocketApi;
}

export interface ApolloHttpGraphQLContext extends BaseContext {
  readonly request: {
    readonly headers: Readonly<Record<string, string | undefined>>;
    readonly multiValueHeaders: Readonly<Record<string, string[] | undefined>>;
  };
  readonly response: {
    readonly headers: Record<string, string | number | boolean>;
    readonly multiValueHeaders: Record<string, (boolean | number | string)[]>;
  };
  readonly logger: Logger;
  readonly publish: Publisher;
}

export function createApolloHttpHandler<TGraphQLContext extends BaseContext>(
  params: CreateApolloHttpHandlerParams<TGraphQLContext>
): APIGatewayProxyHandler {
  const { logger } = params;
  logger.info('createApolloHttpHandler');

  const graphQL = createApolloGraphQLContext(params.graphQL);
  const dynamoDB = createDynamoDBContext(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const handlerContext: ApolloHttpHandlerContext = {
    ...params,
    schema: graphQL.schema,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    socketApi: apiGateway.socketApi,
  };

  const includeStacktraceInErrorResponses =
    graphQL.apolloServerOptions.includeStacktraceInErrorResponses ??
    process.env.NODE_ENV === 'development';
  const formatError = graphQL.apolloServerOptions.formatError ?? ((err) => err);

  type GraphQLContext = BaseGraphQLContext & ApolloHttpGraphQLContext & TGraphQLContext;
  const apollo = new ApolloServer<GraphQLContext>({
    ...graphQL.apolloServerOptions,
    schema: graphQL.schema,
    nodeEnv: process.env.NODE_ENV,
  });
  apollo.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  return async (event) => {
    try {
      event.headers = lowercaseHeaderKeys(event.headers);

      logger.info('event:HTTP');

      const httpGraphQLRequest = parseGraphQLRequestEvent(event);

      const responseHeadersFromResolvers: ApolloHttpGraphQLContext['response']['headers'] =
        {};
      const responseMultiValueHeadersFromResolvers: ApolloHttpGraphQLContext['response']['multiValueHeaders'] =
        {};

      const { createGraphQLContext, createIsCurrentConnection, willSendResponse } =
        await params.requestDidStart({ context: handlerContext, event });

      const preEventContext = {
        ...handlerContext,
        loaders: {
          subscriptions: createObjectLoader(handlerContext.models.subscriptions, [
            'queryAllByTopic',
            'queryAllByTopicFilter',
          ]),
        },
      };

      const graphQLContext: GraphQLContext = {
        ...(await createGraphQLContext()),
        eventType: 'request',
        request: {
          headers: event.headers,
          multiValueHeaders: event.multiValueHeaders,
        },
        response: {
          headers: responseHeadersFromResolvers,
          multiValueHeaders: responseMultiValueHeadersFromResolvers,
        },
        logger,
        publish: createPublisher<GraphQLContext>({
          context: {
            ...preEventContext,
            formatError,
            formatErrorOptions: {
              includeStacktrace: includeStacktraceInErrorResponses,
            },
          },
          getGraphQLContext: () => graphQLContext,
          isCurrentConnection: createIsCurrentConnection?.(),
        }),
      };

      const graphQLResponse = await apollo.executeHTTPGraphQLRequest({
        httpGraphQLRequest,
        context: () => Promise.resolve(graphQLContext),
      });

      if (graphQLResponse.body.kind !== 'complete') {
        throw new Error(
          `Only complete body type supported. Is "${graphQLResponse.body.kind}"`
        );
      }

      const result: APIGatewayProxyNonNullableResult = {
        statusCode: graphQLResponse.status ?? 200,
        headers: {
          ...Object.fromEntries(graphQLResponse.headers),
          ...responseHeadersFromResolvers,
          'content-length': Buffer.byteLength(graphQLResponse.body.string).toString(),
        },
        multiValueHeaders: responseMultiValueHeadersFromResolvers,
        body: graphQLResponse.body.string,
      };

      await willSendResponse?.(result);

      return result;
    } catch (err) {
      logger.error('apolloHttpHandler', { err, event });
      throw err;
    }
  };
}
