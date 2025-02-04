import { ConnectionTable } from '~lambda-graphql/dynamodb/models/connection';
import { ApiOptions } from '../graphql/types';
import { CookiesMongoDBDynamoDBAuthenticationService } from '../services/auth/auth-service';
import { AuthenticationService } from '../services/auth/types';
import { SessionsCookie } from '../services/http/sessions-cookie';
import {
  ConnectionCustomData,
  parseConnectionCustomData,
} from './connection-custom-data';

export class ConnectionsAuthenticationServiceCache {
  private readonly cache = new Map<
    string,
    {
      service: AuthenticationService;
      customData: ConnectionCustomData;
      modified: boolean;
    }
  >();

  get changedCustomDatas(): { connectionId: string; customData: ConnectionCustomData }[] {
    return [...this.cache.entries()]
      .filter((entry) => entry[1].modified)
      .map((entry) => ({
        connectionId: entry[0],
        customData: entry[1].customData,
      }));
  }

  constructor(
    private readonly ctx: {
      connections: Pick<ConnectionTable, 'get'>;
      mongoDB: ConstructorParameters<
        typeof CookiesMongoDBDynamoDBAuthenticationService
      >[0]['mongoDB'];
      apiOptions: {
        sessions?: {
          cookieKey?: NonNullable<ApiOptions['sessions']>['cookieKey'];
        };
      };
    }
  ) {}

  async getCustomData(connectionId: string) {
    return (await this.getValue(connectionId))?.customData;
  }

  async get(connectionId: string | undefined) {
    if (!connectionId) {
      return this.createAuthService();
    }

    const value = await this.getValue(connectionId);
    if (!value) {
      return this.createAuthService();
    }

    return value.service;
  }

  private createAuthService() {
    return new CookiesMongoDBDynamoDBAuthenticationService({
      mongoDB: this.ctx.mongoDB,
    });
  }

  private async getValue(connectionId: string) {
    let value = this.cache.get(connectionId);
    if (value) {
      return value;
    }

    const connection = await this.ctx.connections.get({
      id: connectionId,
    });
    if (!connection) {
      return;
    }

    const customData = parseConnectionCustomData(connection.customData);

    value = {
      service: new CookiesMongoDBDynamoDBAuthenticationService(
        {
          mongoDB: this.ctx.mongoDB,
          sessionsCookie: new SessionsCookie(
            {
              model: customData.sessionsCookie,
            },
            {
              key: this.ctx.apiOptions.sessions?.cookieKey,
            }
          ),
        },
        customData.authenticatedContexts
      ),
      customData,
      modified: false,
    };

    customData.authenticatedContexts.eventBus.on('*', () => {
      value.modified = true;
    });

    this.cache.set(connectionId, value);

    return value;
  }
}
