import {
  ApiGatewayManagementApiClient,
  ApiGatewayManagementApiClientConfig,
  DeleteConnectionCommand,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { Message } from 'graphql-ws';

import { Logger } from '../utils/logger';

export interface ApiGatewayContextConfig {
  newClient: (config: ApiGatewayManagementApiClientConfig) => ApiGatewayManagementApiClient;
  logger: Logger;
}

export interface ApiGatewayContext {
  socketApi: WebSocketApi;
}

interface Endpoint {
  domainName: string;
  stage: string;
}

export interface WebSocketApi {
  post(args: Endpoint & { connectionId: string; message: Message }): Promise<void>;

  delete(args: Endpoint & { connectionId: string }): Promise<void>;
}

export function buildApiGatewayContext(config: ApiGatewayContextConfig): ApiGatewayContext {
  const clientCache: Record<string, ApiGatewayManagementApiClient> = {};

  function getClient({ domainName, stage }: Endpoint) {
    const endpoint = `https://${domainName}/${stage}`;
    if (!(endpoint in clientCache)) {
      clientCache[endpoint] = config.newClient({
        endpoint,
        apiVersion: 'latest',
      });
    }
    return clientCache[endpoint];
  }

  return {
    socketApi: {
      async post({ domainName, stage, connectionId, message }) {
        config.logger.info('socketApi:post', {
          connectionId,
          message,
        });

        const client = getClient({
          domainName,
          stage,
        });

        await client.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify(message),
          })
        );
      },
      async delete({ domainName, stage, connectionId }) {
        config.logger.info('socketApi:delete', {
          connectionId,
        });

        const client = getClient({
          domainName,
          stage,
        });

        await client.send(
          new DeleteConnectionCommand({
            ConnectionId: connectionId,
          })
        );
      },
    },
  };
}
