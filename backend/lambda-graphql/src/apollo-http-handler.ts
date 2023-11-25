import { BaseContext } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { GraphQLSchema } from 'graphql';

import { Logger } from '~common/logger';

import parseGraphQLRequestEvent from './apigateway-proxy-event/parseGraphQLRequestEvent';
import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import { GraphQLContextParams, createGraphQlContext } from './context/graphql';
import { ConnectionTable } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { Publisher, createPublisher } from './pubsub/publish';

export interface CreateApolloHttpHandlerParams<
  TGraphQLContext,
  TConnectionGraphQLContext,
> {
  createGraphQLContext: (
    context: ApolloHttpHandlerContext<TConnectionGraphQLContext>,
    event: APIGatewayProxyEvent
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  graphQL: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
  logger: Logger;
}

export interface ApolloHttpHandlerContext<TConnectionGraphQLContext> {
  schema: GraphQLSchema;
  models: {
    connections: ConnectionTable<TConnectionGraphQLContext>;
    subscriptions: SubscriptionTable;
  };
  socketApi: WebSocketApi;
  logger: Logger;
}

export interface GraphQLContext extends BaseContext {
  readonly request: {
    readonly headers: Readonly<Record<string, string | undefined>>;
    readonly multiValueHeaders: Readonly<Record<string, string[] | undefined>>;
  };
  response: {
    headers: Record<string, string | number | boolean>;
    multiValueHeaders: Record<string, (boolean | number | string)[]>;
  };
  readonly publish: Publisher;
}

export function createApolloHttpHandler<TGraphQLContext, TConnectionGraphQLContext>(
  params: CreateApolloHttpHandlerParams<TGraphQLContext, TConnectionGraphQLContext>
): APIGatewayProxyHandler {
  const logger = params.logger;
  logger.info('createApolloHttpHandler');

  const graphQL = createGraphQlContext(params.graphQL);
  const dynamoDB = createDynamoDbContext<TConnectionGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: ApolloHttpHandlerContext<TConnectionGraphQLContext> = {
    schema: graphQL.schema,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    socketApi: apiGateway.socketApi,
    logger: logger,
  };

  const apollo = new ApolloServer<GraphQLContext & TGraphQLContext>({
    schema: graphQL.schema,
    introspection: process.env.NODE_ENV !== 'production',
    nodeEnv: process.env.NODE_ENV,
  });
  apollo.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  const publishToSubscribers = createPublisher<TConnectionGraphQLContext>(context);

  return async (event) => {
    try {
      const httpGraphQLRequest = parseGraphQLRequestEvent(event);

      const responseHeadersFromResolvers: GraphQLContext['response']['headers'] = {};
      const responseMultiValueHeadersFromResolvers: GraphQLContext['response']['multiValueHeaders'] =
        {};

      const res = await apollo.executeHTTPGraphQLRequest({
        httpGraphQLRequest,
        context: async () => ({
          ...(await params.createGraphQLContext(context, event)),
          request: {
            headers: event.headers,
            multiValueHeaders: event.multiValueHeaders,
          },
          response: {
            headers: responseHeadersFromResolvers,
            multiValueHeaders: responseMultiValueHeadersFromResolvers,
          },
          publish: publishToSubscribers,
        }),
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
      logger.error('apolloHttpHandler', err as Error, { event });
      throw err;
    }
  };
}
