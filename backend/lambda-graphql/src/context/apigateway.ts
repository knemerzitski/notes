import {
  ApiGatewayManagementApiClient,
  ApiGatewayManagementApiClientConfig,
  DeleteConnectionCommand,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { Message } from 'graphql-ws';

import { Logger } from '~common/logger';

export interface ApiGatewayContextParams {
  newClient: (
    config: ApiGatewayManagementApiClientConfig
  ) => ApiGatewayManagementApiClient;
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
  post(args: Endpoint & { connectionId: string; message: Message }): Promise<undefined>;

  delete(args: Endpoint & { connectionId: string }): Promise<undefined>;
}

export function createApiGatewayContext(
  params: ApiGatewayContextParams
): ApiGatewayContext {
  const clientCache: Record<string, ApiGatewayManagementApiClient> = {};

  function getClient({ domainName, stage }: Endpoint): ApiGatewayManagementApiClient {
    const endpoint = `https://${domainName}/${stage}`;
    let client = clientCache[endpoint];
    if (!client) {
      client = params.newClient({
        endpoint,
        apiVersion: 'latest',
      });
      clientCache[endpoint] = client;
    }
    return client;
  }

  return {
    socketApi: {
      async post({ domainName, stage, connectionId, message }) {
        params.logger.info('socketApi:post', {
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
        params.logger.info('socketApi:delete', {
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
