import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { GraphQLError, GraphQLSchema, parse } from 'graphql';
import { buildExecutionContext } from 'graphql/execution/execute';
import { MessageType } from 'graphql-ws';
import { isArray } from '~utils/array/is-array';
import { Logger } from '~utils/logger';
import { Maybe, MaybePromise } from '~utils/types';

import { WebSocketConnectEvent } from './connect-handler';
import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDbContext } from './context/dynamodb';
import { GraphQLContextParams, createGraphQLContext } from './context/graphql';
import { ConnectionTable, DynamoDBRecord } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import { Publisher, createPublisher } from './pubsub/publish';
import {
  SubscriptionContext,
  createSubscriptionContext,
  getSubscribeFieldResult,
} from './pubsub/subscribe';

interface DirectParams<
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> {
  createGraphQLContext: (
    context: Omit<
      WebSocketDisconnectHandlerContext<
        TGraphQLContext,
        TBaseGraphQLContext,
        TDynamoDBGraphQLContext
      >,
      'graphQLContext' | 'createGraphQLContext'
    >,
    event: APIGatewayProxyWebsocketEventV2
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  apiGateway: ApiGatewayContextParams;
  logger: Logger;
  parseDynamoDBGraphQLContext: (
    value: TDynamoDBGraphQLContext | undefined
  ) => TBaseGraphQLContext;
  onDisconnect?: (args: {
    context: WebSocketDisconnectHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >;
    event: WebSocketConnectEvent;
  }) => Maybe<MaybePromise<TDynamoDBGraphQLContext>>;
}

export interface WebSocketDisconnectHandlerParams<
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> extends DirectParams<TGraphQLContext, TBaseGraphQLContext, TDynamoDBGraphQLContext> {
  graphQL: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
}

export interface WebSocketDisconnectHandlerContext<
  TGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
> extends DirectParams<TGraphQLContext, TBaseGraphQLContext, TDynamoDBGraphQLContext> {
  schema: GraphQLSchema;
  graphQLContext: TGraphQLContext;
  models: {
    connections: ConnectionTable<TDynamoDBGraphQLContext>;
    subscriptions: SubscriptionTable<TDynamoDBGraphQLContext>;
  };
  socketApi: WebSocketApi;
  createGraphQLContext: WebSocketDisconnectHandlerParams<
    TGraphQLContext,
    TBaseGraphQLContext,
    TDynamoDBGraphQLContext
  >['createGraphQLContext'];
}

export interface WebSocketDisconnectGraphQLContext extends Record<string, unknown> {
  readonly logger: Logger;
  readonly publish: Publisher;
}

/**
 * Add headers types to APIGatewayProxyWebsocketEventV2 since they're
 * available during $connect and $disconnect route
 */
export type WebSocketDisconnectEvent = APIGatewayProxyWebsocketEventV2 & {
  headers?: APIGatewayProxyEventHeaders;
  multiValueHeaders?: APIGatewayProxyEventMultiValueHeaders;
};

export type WebSocketDisconnectHandler<T = never> = Handler<
  WebSocketDisconnectEvent,
  APIGatewayProxyResultV2<T>
>;

const defaultResponse: APIGatewayProxyResultV2 = {
  statusCode: 200,
};

export function createWebSocketDisconnectHandler<
  TGraphQLContext extends WebSocketDisconnectGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>(
  params: WebSocketDisconnectHandlerParams<
    TGraphQLContext,
    TBaseGraphQLContext,
    TDynamoDBGraphQLContext
  >
): WebSocketDisconnectHandler {
  const { logger } = params;
  logger.info('createWebSocketDisconnectHandler');

  const graphQL = createGraphQLContext(params.graphQL);
  const dynamoDB = createDynamoDbContext<TDynamoDBGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: Omit<
    WebSocketDisconnectHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >,
    'graphQLContext'
  > = {
    ...params,
    schema: graphQL.schema,
    models: {
      connections: dynamoDB.connections,
      subscriptions: dynamoDB.subscriptions,
    },
    socketApi: apiGateway.socketApi,
  };

  return webSocketDisconnectHandler(context);
}

export function webSocketDisconnectHandler<
  TGraphQLContext extends WebSocketDisconnectGraphQLContext,
  TBaseGraphQLContext,
  TDynamoDBGraphQLContext extends DynamoDBRecord,
>(
  context: Omit<
    WebSocketDisconnectHandlerContext<
      TGraphQLContext,
      TBaseGraphQLContext,
      TDynamoDBGraphQLContext
    >,
    'graphQLContext'
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
        ...(await context.createGraphQLContext(context, event)),
      };

      const isCurrentConnection = (id: string) => connectionId === id;
      partialGraphQLContext.publish = createPublisher<
        Omit<TGraphQLContext, 'publish'>,
        TDynamoDBGraphQLContext
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

      const subscriptionDeletions = connectionSubscriptions.map(async (sub) => {
        try {
          // Call resolver onComplete
          const baseGraphQLContext = context.parseDynamoDBGraphQLContext(
            sub.connectionGraphQLContext
          );

          const execContextValue: SubscriptionContext &
            TGraphQLContext &
            TBaseGraphQLContext = {
            ...context,
            ...graphQLContext,
            ...baseGraphQLContext,
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

          context.logger.info('event:DISCONNECT:onComplete', {
            onComplete: !!onComplete,
          });
          await onComplete?.();
        } catch (err) {
          if (err instanceof GraphQLError) {
            return context.socketApi.post({
              ...event.requestContext,
              message: {
                type: MessageType.Error,
                id: sub.subscriptionId,
                payload: [err],
              },
            });
          } else {
            context.logger.error('event:DISCONNECT:complete', err as Error, {
              connectionId,
              subscription: sub,
            });
          }
        }

        await context.models.subscriptions.delete({ id: sub.id });
      });

      const connectionDeletion = context.models.connections.delete({ id: connectionId });

      await Promise.allSettled([connectionDeletion, ...subscriptionDeletions]);

      return Promise.resolve(defaultResponse);
    } catch (err) {
      context.logger.error('event:DISCONNECT', err as Error, { event });
      throw err;
    }
  };
}
