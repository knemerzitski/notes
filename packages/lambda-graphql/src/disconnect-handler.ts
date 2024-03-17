import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GraphQLSchema, parse } from 'graphql';
import { buildExecutionContext } from 'graphql/execution/execute';

import { isArray } from '~utils/isArray';
import { Logger } from '~utils/logger';
import { Maybe, MaybePromise } from '~utils/types';

import { WebSocketConnectEventEvent } from './connect-handler';
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
import {
  SubscriptionContext,
  createSubscriptionContext,
  getSubscribeFieldResult,
} from './pubsub/subscribe';

interface DirectParams<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> {
  createGraphQLContext: (
    context: WebSocketDisconnectHandlerContextWithoutGraphQLContext<
      TGraphQLContext,
      TOnConnectGraphQLContext
    >,
    event: APIGatewayProxyWebsocketEventV2
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  apiGateway: ApiGatewayContextParams;
  logger: Logger;

  onDisconnect?: (args: {
    context: WebSocketDisconnectHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>;
    event: WebSocketConnectEventEvent;
  }) => Maybe<MaybePromise<TOnConnectGraphQLContext>>;
}

export interface WebSocketDisconnectHandlerParams<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TGraphQLContext, TOnConnectGraphQLContext> {
  graphQl: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
}

export interface WebSocketDisconnectHandlerContext<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> extends DirectParams<TGraphQLContext, TOnConnectGraphQLContext> {
  schema: GraphQLSchema;
  graphQLContext: TGraphQLContext;
  models: {
    connections: ConnectionTable<TOnConnectGraphQLContext>;
    subscriptions: SubscriptionTable<TOnConnectGraphQLContext>;
  };
  socketApi: WebSocketApi;
}

export interface WebSocketDisconnectGraphQLContext extends Record<string, unknown> {
  readonly logger: Logger;
  readonly publish: Publisher;
}

type WebSocketDisconnectHandlerContextWithoutGraphQLContext<
  TGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
> = Omit<
  WebSocketDisconnectHandlerContext<TGraphQLContext, TOnConnectGraphQLContext>,
  'graphQLContext'
>;

/**
 * Add headers types to APIGatewayProxyWebsocketEventV2 since they're
 * available during $connect and $disconnect route
 */
export type WebSocketDisconnectEventEvent = APIGatewayProxyWebsocketEventV2 & {
  headers?: APIGatewayProxyEventHeaders;
  multiValueHeaders?: APIGatewayProxyEventMultiValueHeaders;
};

export type WebSocketDisconnectHandler<T = never> = Handler<
  WebSocketDisconnectEventEvent,
  APIGatewayProxyResultV2<T>
>;

const defaultResponse: APIGatewayProxyResultV2 = {
  statusCode: 200,
};

export function createWebSocketDisconnectHandler<
  TGraphQLContext extends WebSocketDisconnectGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  params: WebSocketDisconnectHandlerParams<TGraphQLContext, TOnConnectGraphQLContext>
): WebSocketDisconnectHandler {
  const { logger } = params;
  logger.info('createWebSocketDisconnectHandler');

  const graphQl = createGraphQlContext(params.graphQl);
  const dynamoDB = createDynamoDbContext<TOnConnectGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: WebSocketDisconnectHandlerContextWithoutGraphQLContext<
    TGraphQLContext,
    TOnConnectGraphQLContext
  > = {
    ...params,
    schema: graphQl.schema,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    socketApi: apiGateway.socketApi,
  };

  return webSocketDisconnectHandler(params, context);
}

export function webSocketDisconnectHandler<
  TGraphQLContext extends WebSocketDisconnectGraphQLContext,
  TOnConnectGraphQLContext extends OnConnectGraphQLContext,
>(
  {
    createGraphQLContext,
  }: Pick<
    WebSocketDisconnectHandlerParams<TGraphQLContext, TOnConnectGraphQLContext>,
    'createGraphQLContext'
  >,
  context: WebSocketDisconnectHandlerContextWithoutGraphQLContext<
    TGraphQLContext,
    TOnConnectGraphQLContext
  >
): WebSocketDisconnectHandler {
  return async (event) => {
    try {
      const { eventType, connectionId } = event.requestContext;
      if (eventType !== 'DISCONNECT') {
        throw new Error(`Invalid event type. Expected DISCONNECT but is ${eventType}`);
      }

      context.logger.info('event:DISCONNECT', {
        connectionId,
      });

      const partialGraphQLContext: TGraphQLContext & {
        publish?: TGraphQLContext['publish'];
      } = {
        ...(await createGraphQLContext(context, event)),
      };

      const isCurrentConnection = (id: string) => connectionId === id;
      partialGraphQLContext.publish = createPublisher<
        Omit<TGraphQLContext, 'publish'>,
        TOnConnectGraphQLContext
      >({
        context: {
          ...context,
          graphQLContext: partialGraphQLContext,
        },
        isCurrentConnection,
      });

      const graphQLContext: TGraphQLContext = partialGraphQLContext;

      context.logger.info('messages:disconnect:onDisconnect', {
        onDisconnect: !!context.onDisconnect,
      });
      await context.onDisconnect?.({
        context: { ...context, graphQLContext },
        event,
      });

      const connectionSubscriptions =
        await context.models.subscriptions.queryAllByConnectionId(connectionId);

      const deletions = connectionSubscriptions.map(async (sub) => {
        const execContextValue: SubscriptionContext &
          TGraphQLContext &
          OnConnectGraphQLContext = {
          ...context,
          ...graphQLContext,
          ...sub.connectionOnConnectGraphQLContext,
          ...createSubscriptionContext(),
        };

        const execContext = buildExecutionContext({
          schema: context.schema,
          document: parse(sub.subscription.query),
          contextValue: execContextValue,
          variableValues: sub.subscription.variables,
          operationName: sub.subscription.operationName,
        });

        if (isArray(execContext)) {
          throw new AggregateError(execContext);
        }

        const { onComplete } = await getSubscribeFieldResult(execContext);

        context.logger.info('messages:onComplete', { onComplete: !!onComplete });
        await onComplete?.();

        await context.models.subscriptions.delete({ id: sub.id });
      });

      await context.models.connections.delete({ id: connectionId });

      await Promise.all(deletions);

      return Promise.resolve(defaultResponse);
    } catch (err) {
      context.logger.error('event:DISCONNECT', err as Error, { event });
      throw err;
    }
  };
}
