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

import { isArray } from '../../utils/src/array/is-array';

import { Logger } from '../../utils/src/logging';

import { MaybePromise } from '../../utils/src/types';

import { WebSocketConnectEvent } from './connect-handler';
import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDBContext } from './context/dynamodb';
import { GraphQLContextParams, createGraphQLContext } from './context/graphql';
import { createObjectLoader, ObjectLoader } from './dynamodb/loader';
import { ConnectionTable } from './dynamodb/models/connection';
import { SubscriptionTable } from './dynamodb/models/subscription';
import {
  FormatError,
  FormatErrorOptions,
  formatUnknownError,
} from './graphql/format-unknown-error';
import { Publisher, createPublisher } from './pubsub/publish';
import {
  SubscribeHookError,
  SubscriptionGraphQLContext,
  createSubscriptionContext,
  getSubscribeFieldResult,
} from './pubsub/subscribe';
import { BaseGraphQLContext } from './type';

interface DirectParams<TGraphQLContext> {
  readonly apiGateway: ApiGatewayContextParams;
  readonly logger: Logger;
  readonly onDisconnect?: (args: {
    context: WebSocketDisconnectHandlerEventContext<TGraphQLContext>;
    event: WebSocketConnectEvent;
  }) => MaybePromise<void>;
  readonly formatError?: FormatError;
  readonly formatErrorOptions?: FormatErrorOptions;
  readonly requestDidStart: (args: {
    readonly context: WebSocketDisconnectHandlerPreEventContext<TGraphQLContext>;
    readonly event: APIGatewayProxyWebsocketEventV2;
  }) => MaybePromise<{
    readonly createGraphQLContext: (
      connectionId?: string
    ) => MaybePromise<TGraphQLContext>;
    readonly willSendResponse?: (response: APIGatewayProxyResultV2) => void;
  }>;
}

export interface WebSocketDisconnectHandlerParams<TGraphQLContext>
  extends DirectParams<TGraphQLContext> {
  graphQL: GraphQLContextParams<TGraphQLContext>;
  dynamoDB: DynamoDBContextParams;
}

export interface WebSocketDisconnectHandlerContext<TGraphQLContext>
  extends DirectParams<TGraphQLContext> {
  schema: GraphQLSchema;
  models: {
    connections: ConnectionTable;
    subscriptions: SubscriptionTable;
  };
  socketApi: WebSocketApi;
  formatError: FormatError;
}

export interface WebSocketDisconnectHandlerEventContext<TGraphQLContext>
  extends WebSocketDisconnectHandlerContext<TGraphQLContext> {
  isConnectionDeleted: boolean;
  readonly createGraphQLContext: (
    connectionId?: string
  ) => Promise<TGraphQLContext> | TGraphQLContext;
  loaders: {
    connections: ObjectLoader<ConnectionTable, 'get'>;
    subscriptions: ObjectLoader<
      SubscriptionTable,
      'get' | 'queryAllByConnectionId' | 'queryAllByTopic' | 'queryAllByTopicFilter'
    >;
  };
}

type WebSocketDisconnectHandlerPreEventContext<TGraphQLContext> = Omit<
  WebSocketDisconnectHandlerEventContext<TGraphQLContext>,
  'createGraphQLContext'
>;

export interface WebSocketDisconnectGraphQLContext {
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

export function createWebSocketDisconnectHandler<TGraphQLContext>(
  params: WebSocketDisconnectHandlerParams<TGraphQLContext>
): WebSocketDisconnectHandler {
  const { logger } = params;
  logger.info('createWebSocketDisconnectHandler');

  const graphQL = createGraphQLContext(params.graphQL);
  const dynamoDB = createDynamoDBContext(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: Omit<
    WebSocketDisconnectHandlerContext<TGraphQLContext>,
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

export function webSocketDisconnectHandler<TGraphQLContext>(
  handlerContext: Omit<
    WebSocketDisconnectHandlerContext<TGraphQLContext>,
    'graphQLContext'
  >
): WebSocketDisconnectHandler {
  return async (event) => {
    try {
      const { eventType, connectionId } = event.requestContext;
      if (eventType !== 'DISCONNECT') {
        throw new Error(`Invalid event type. Expected DISCONNECT but is ${eventType}`);
      }

      handlerContext.logger.info('event:DISCONNECT', {
        connectionId,
      });

      const preEventContext: WebSocketDisconnectHandlerPreEventContext<TGraphQLContext> =
        {
          ...handlerContext,
          isConnectionDeleted: false,
          loaders: {
            connections: createObjectLoader(handlerContext.models.connections, ['get']),
            subscriptions: createObjectLoader(handlerContext.models.subscriptions, [
              'get',
              'queryAllByConnectionId',
              'queryAllByTopic',
              'queryAllByTopicFilter',
            ]),
          },
        };

      const { createGraphQLContext, willSendResponse } =
        await handlerContext.requestDidStart({
          context: preEventContext,
          event,
        });

      const eventContext: WebSocketDisconnectHandlerEventContext<TGraphQLContext> = {
        ...preEventContext,
        createGraphQLContext,
      };

      handlerContext.logger.info('messages:disconnect:onDisconnect', {
        onDisconnect: !!handlerContext.onDisconnect,
      });
      await handlerContext.onDisconnect?.({
        context: eventContext,
        event,
      });

      const connectionSubscriptions =
        await preEventContext.loaders.subscriptions.queryAllByConnectionId(connectionId);

      const subscriptionDeletions = connectionSubscriptions.map(async (sub) => {
        try {
          // Call resolver onComplete
          const graphQLContextValue: BaseGraphQLContext &
            SubscriptionGraphQLContext &
            WebSocketDisconnectGraphQLContext &
            TGraphQLContext = {
            ...(await createGraphQLContext()),
            ...createSubscriptionContext(),
            eventType: 'subscription',
            logger: handlerContext.logger,
            publish: createPublisher<TGraphQLContext>({
              context: eventContext,
              getGraphQLContext: async (connectionId) => ({
                ...graphQLContextValue,
                ...(await createGraphQLContext(connectionId)),
              }),
              isCurrentConnection: (id: string) => connectionId === id,
            }),
          };

          const exeContext = buildExecutionContext({
            schema: handlerContext.schema,
            document: parse(sub.subscription.query),
            contextValue: graphQLContextValue,
            variableValues: sub.subscription.variables,
            operationName: sub.subscription.operationName,
          });

          if (isArray(exeContext)) {
            throw new AggregateError(exeContext);
          }

          const { onComplete } = await getSubscribeFieldResult(exeContext);

          handlerContext.logger.info('event:DISCONNECT:onComplete', {
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

          handlerContext.logger.error('event:DISCONNECT:complete', {
            err: postError,
            connectionId,
            subscription: sub,
          });

          return handlerContext.socketApi.post({
            ...event.requestContext,
            message: {
              type: MessageType.Error,
              id: sub.subscriptionId,
              payload: [
                formatUnknownError(postError, handlerContext.formatError, {
                  ...handlerContext.formatErrorOptions,
                  exeContext,
                  extraPath: hookName,
                }),
              ],
            },
          });
        }

        await handlerContext.models.subscriptions.delete({ id: sub.id });
      });

      const connectionDeletion = handlerContext.models.connections.delete({
        id: connectionId,
      });

      preEventContext.isConnectionDeleted = true;
      await Promise.allSettled([connectionDeletion, ...subscriptionDeletions]);

      const result = defaultResponse;

      willSendResponse?.(result);

      return result;
    } catch (err) {
      handlerContext.logger.error('event:DISCONNECT', { err, event });
      throw err;
    }
  };
}
