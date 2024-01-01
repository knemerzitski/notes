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
import { ConnectionTable, OnConnectGraphQLContext } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { Publisher, createPublisher } from './pubsub/publish';

interface DirectParams {
  logger: Logger;
}

export interface CreateApolloHttpHandlerParams<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams {
  createGraphQLContext: (
    context: ApolloHttpHandlerContext<TOnConnectGraphQLContext>,
    event: APIGatewayProxyEvent
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  graphQL: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
}

export interface ApolloHttpHandlerContext<
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams {
  schema: GraphQLSchema;
  models: {
    connections: ConnectionTable<TOnConnectGraphQLContext>;
    subscriptions: SubscriptionTable<TOnConnectGraphQLContext>;
  };
  socketApi: WebSocketApi;
}

export interface ApolloHttpGraphQLContext extends BaseContext {
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

export function createApolloHttpHandler<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  params: CreateApolloHttpHandlerParams<TGraphQLContext, TOnConnectGraphQLContext>
): APIGatewayProxyHandler {
  const { logger } = params;
  logger.info('createApolloHttpHandler');

  const graphQL = createGraphQlContext(params.graphQL);
  const dynamoDB = createDynamoDbContext<TOnConnectGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: ApolloHttpHandlerContext<TOnConnectGraphQLContext> = {
    ...params,
    schema: graphQL.schema,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    socketApi: apiGateway.socketApi,
  };

  type GraphQLContext = ApolloHttpGraphQLContext & TGraphQLContext;
  const apollo = new ApolloServer<GraphQLContext>({
    schema: graphQL.schema,
    introspection: process.env.NODE_ENV !== 'production',
    nodeEnv: process.env.NODE_ENV,
  });
  apollo.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  return async (event) => {
    try {
      const httpGraphQLRequest = parseGraphQLRequestEvent(event);

      const responseHeadersFromResolvers: ApolloHttpGraphQLContext['response']['headers'] =
        {};
      const responseMultiValueHeadersFromResolvers: ApolloHttpGraphQLContext['response']['multiValueHeaders'] =
        {};

      const graphQLContext: GraphQLContext & { publish: Publisher } = {
        ...(await params.createGraphQLContext(context, event)),
        request: {
          headers: event.headers,
          multiValueHeaders: event.multiValueHeaders,
        },
        response: {
          headers: responseHeadersFromResolvers,
          multiValueHeaders: responseMultiValueHeadersFromResolvers,
        },
        publish() {
          throw new Error('Publish has not been initialized');
        },
      };
      graphQLContext.publish = createPublisher<GraphQLContext, TOnConnectGraphQLContext>({
        ...context,
        graphQLContext,
      });
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
      logger.error('apolloHttpHandler', err as Error, { event });
      throw err;
    }
  };
}
