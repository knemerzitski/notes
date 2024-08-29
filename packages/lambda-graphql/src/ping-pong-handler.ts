import { Handler } from 'aws-lambda';
import { MessageType } from 'graphql-ws';
import { Logger } from '~utils/logging';
import { MaybePromise } from '~utils/types';

import {
  ApiGatewayContextParams,
  WebSocketApi,
  createApiGatewayContext,
} from './context/apigateway';
import { DynamoDBContextParams, createDynamoDBContext } from './context/dynamodb';
import { PingPongContextParams, PingPongMachineInput } from './context/pingpong';
import { ConnectionTable, DynamoDBRecord } from './dynamodb/models/connection';

interface DirectParams {
  logger: Logger;
  pingpong: Pick<PingPongContextParams, 'delay' | 'timeout'>;
}

export interface PingPongHandlerParams extends DirectParams {
  dynamoDB: DynamoDBContextParams;
  apiGateway: ApiGatewayContextParams;
}

export interface PingPongHandlerContext<TDynamoDBGraphQLContext extends DynamoDBRecord>
  extends DirectParams {
  models: {
    connections: ConnectionTable<TDynamoDBGraphQLContext>;
  };
  socketApi: WebSocketApi;
}

export type PingPongHandler = Handler<
  PingPongMachineInput,
  MaybePromise<PingPongMachineInput>
>;

export function createPingPongHandler<TDynamoDBGraphQLContext extends DynamoDBRecord>(
  params: PingPongHandlerParams
) {
  const { logger } = params;

  logger.info('createPingPongHandler');

  const dynamoDB = createDynamoDBContext<TDynamoDBGraphQLContext>(params.dynamoDB);
  const apiGateway = createApiGatewayContext(params.apiGateway);

  const context: PingPongHandlerContext<TDynamoDBGraphQLContext> = {
    ...params,
    models: {
      connections: dynamoDB.connections,
    },
    socketApi: apiGateway.socketApi,
  };

  return pingPongHandler<TDynamoDBGraphQLContext>(context);
}

export function pingPongHandler<TDynamoDBGraphQLContext extends DynamoDBRecord>(
  context: PingPongHandlerContext<TDynamoDBGraphQLContext>
): PingPongHandler {
  return async (input) => {
    // Send ping
    if (input.state === 'PING') {
      await context.models.connections.update(
        { id: input.connectionId },
        { hasPonged: false }
      );
      await context.socketApi.post({
        ...input,
        message: { type: MessageType.Ping },
      });
      return {
        ...input,
        state: 'REVIEW',
        seconds: context.pingpong.delay,
      };
    }

    // Expect pong returned
    const connection = await context.models.connections.get({ id: input.connectionId });
    if (connection?.hasPonged) {
      context.logger.info('hasPonged');
      return {
        ...input,
        state: 'PING',
        seconds: context.pingpong.timeout,
      };
    }

    // Didn't respond to ping, delete connection
    await context.socketApi.delete({ ...input });
    return {
      ...input,
      state: 'ABORT',
    };
  };
}
