import { BaseContext, ApolloServer } from '@apollo/server';
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { GraphQLSchema } from 'graphql/index.js';
import { Logger } from '~utils/logging';

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

interface DirectParams {
  logger: Logger;
}

export interface CreateApolloHttpHandlerParams<TGraphQLContext extends BaseContext>
  extends DirectParams {
  readonly createGraphQLContext: (
    context: ApolloHttpHandlerContext,
    event: APIGatewayProxyEvent
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  readonly createIsCurrentConnection?: (
    context: ApolloHttpHandlerContext,
    event: APIGatewayProxyEvent
  ) => ((connectionId: string) => boolean) | undefined;
  readonly graphQL: ApolloGraphQLContextParams<TGraphQLContext>;
  readonly dynamoDB: DynamoDBContextParams;
  readonly apiGateway: ApiGatewayContextParams;
}

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

  const context: ApolloHttpHandlerContext = {
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

  type GraphQLContext = ApolloHttpGraphQLContext & TGraphQLContext;
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

      const graphQLContext: GraphQLContext = {
        ...(await params.createGraphQLContext(context, event)),
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
            ...context,
            formatError,
            formatErrorOptions: {
              includeStacktrace: includeStacktraceInErrorResponses,
            },
          },
          getGraphQLContext: () => graphQLContext,
          isCurrentConnection: params.createIsCurrentConnection?.(context, event),
        }),
      };

      const res = await apollo.executeHTTPGraphQLRequest({
        httpGraphQLRequest,
        context: () => Promise.resolve(graphQLContext),
      });

      if (res.body.kind !== 'complete') {
        throw new Error(`Only complete body type supported. Is "${res.body.kind}"`);
      }

      return {
        statusCode: res.status ?? 200,
        headers: {
          ...Object.fromEntries(res.headers),
          ...responseHeadersFromResolvers,
          'content-length': Buffer.byteLength(res.body.string).toString(),
        },
        multiValueHeaders: responseMultiValueHeadersFromResolvers,
        body: res.body.string,
      };
    } catch (err) {
      logger.error('apolloHttpHandler', { err, event });
      throw err;
    }
  };
}
