import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Handler,
} from 'aws-lambda';
import { buildExecutionContext } from 'graphql/execution/execute.js';
import { GraphQLSchema, parse } from 'graphql/index.js';
import { MessageType } from 'graphql-ws';
import { isArray } from '~utils/array/is-array';
import { Logger } from '~utils/logging';
import { Maybe, MaybePromise } from '~utils/types';

import { WebSocketConnectEvent } from './connect-handler';
import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDBContext } from './context/dynamodb';
import { GraphQLContextParams, createGraphQLContext } from './context/graphql';
import { ConnectionTable, DynamoDBRecord } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import {
  FormatError,
  FormatErrorOptions,
  formatUnknownError,
} from './graphql/format-unknown-error';
import { Publisher, createPublisher } from './pubsub/publish';
import {
  SubscribeHookError,
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
  formatError?: FormatError;
  formatErrorOptions?: FormatErrorOptions;
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
  formatError: FormatError;
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
  const dynamoDB = createDynamoDBContext<TDynamoDBGraphQLContext>(params.dynamoDB);
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
    formatError: params.formatError ?? ((err) => err),
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
  TGraphQLContext extends Omit<WebSocketDisconnectGraphQLContext, 'publish'>,
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

      const graphQLContext: TGraphQLContext = await context.createGraphQLContext(
        context,
        event
      );

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

          const graphQLContextValue: SubscriptionContext &
            TGraphQLContext &
            TBaseGraphQLContext = {
            ...context,
            ...graphQLContext,
            ...baseGraphQLContext,
            ...createSubscriptionContext(),
            publish: createPublisher<TGraphQLContext, TDynamoDBGraphQLContext>({
              context,
              getGraphQLContext: () => graphQLContextValue,
              isCurrentConnection: (id: string) => connectionId === id,
            }),
          };

          const exeContext = buildExecutionContext({
            schema: context.schema,
            document: parse(sub.subscription.query),
            contextValue: graphQLContextValue,
            variableValues: sub.subscription.variables,
            operationName: sub.subscription.operationName,
          });

          if (isArray(exeContext)) {
            throw new AggregateError(exeContext);
          }

          const { onComplete } = await getSubscribeFieldResult(exeContext);

          context.logger.info('event:DISCONNECT:onComplete', {
            onComplete: !!onComplete,
          });
          try {
            await onComplete?.(sub.id);
          } catch (err) {
            throw new SubscribeHookError('onComplete', exeContext, err);
          }
        } catch (err) {
          const { exeContext, hookName, cause } = SubscribeHookError.unwrap(err);
          const postError = cause ?? err;

          context.logger.error('event:DISCONNECT:complete', {
            err: postError,
            connectionId,
            subscription: sub,
          });

          return context.socketApi.post({
            ...event.requestContext,
            message: {
              type: MessageType.Error,
              id: sub.subscriptionId,
              payload: [
                formatUnknownError(postError, context.formatError, {
                  ...context.formatErrorOptions,
                  exeContext,
                  extraPath: hookName,
                }),
              ],
            },
          });
        }

        await context.models.subscriptions.delete({ id: sub.id });
      });

      const connectionDeletion = context.models.connections.delete({ id: connectionId });

      await Promise.allSettled([connectionDeletion, ...subscriptionDeletions]);

      return defaultResponse;
    } catch (err) {
      context.logger.error('event:DISCONNECT', { err, event });
      throw err;
    }
  };
}
