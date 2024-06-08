import { BaseContext } from '@apollo/server';
import { ApolloServer } from '@apollo/server';
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { GraphQLSchema } from 'graphql';

import { Logger } from '~utils/logger';

import parseGraphQLRequestEvent from './apigateway-proxy-event/parseGraphQLRequestEvent';
import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import {
  ApolloGraphQLContextParams,
  createApolloGraphQLContext,
} from './context/graphql';
import { ConnectionTable, DynamoDBRecord } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { Publisher, createPublisher } from './pubsub/publish';
import lowercaseHeaderKeys from './apigateway-proxy-event/lowercaseHeaderKeys';

interface DirectParams {
  logger: Logger;
}

export interface CreateApolloHttpHandlerParams<
  TGraphQLContext extends BaseContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> extends DirectParams {
  createGraphQLContext: (
    context: ApolloHttpHandlerContext<TDynamoDBGraphQLContext>,
    event: APIGatewayProxyEvent
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  createIsCurrentConnection?: (
    context: ApolloHttpHandlerContext<TDynamoDBGraphQLContext>,
    event: APIGatewayProxyEvent
  ) => ((connectionId: string) => boolean) | undefined;
  graphQL: ApolloGraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
}

export interface ApolloHttpHandlerContext<TDynamoDBGraphQLContext extends DynamoDBRecord>
  extends DirectParams {
  schema: GraphQLSchema;
  models: {
    connections: ConnectionTable<TDynamoDBGraphQLContext>;
    subscriptions: SubscriptionTable<TDynamoDBGraphQLContext>;
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
  readonly logger: Logger;
  readonly publish: Publisher;
}

export function createApolloHttpHandler<
  TGraphQLContext extends BaseContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>(
  params: CreateApolloHttpHandlerParams<TGraphQLContext, TDynamoDBGraphQLContext>
): APIGatewayProxyHandler {
  const { logger } = params;
  logger.info('createApolloHttpHandler');

  const graphQL = createApolloGraphQLContext(params.graphQL);
  const dynamoDB = createDynamoDbContext<TDynamoDBGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: ApolloHttpHandlerContext<TDynamoDBGraphQLContext> = {
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
    ...graphQL.apolloServerOptions,
    schema: graphQL.schema,
    introspection: process.env.NODE_ENV !== 'production',
    nodeEnv: process.env.NODE_ENV,
  });
  apollo.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

  return async (event) => {
    try {
      event.headers = lowercaseHeaderKeys(event.headers);

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
        logger,
        publish() {
          throw new Error('Publish has not been initialized');
        },
      };

      const isCurrentConnection = params.createIsCurrentConnection?.(context, event);

      graphQLContext.publish = createPublisher<GraphQLContext, TDynamoDBGraphQLContext>({
        context: {
          ...context,
          graphQLContext,
        },
        isCurrentConnection,
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
