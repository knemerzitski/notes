import { ConnectionTable } from '../../../lambda-graphql/src/dynamodb/models/connection';
import { Logger } from '../../../utils/src/logging';

import { ApiOptions } from '../graphql/types';
import { objectIdToStr } from '../mongodb/utils/objectid';
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
      readonly connections: Pick<ConnectionTable, 'get'>;
      readonly options: {
        readonly sessions: {
          readonly cookieKey: ApiOptions['sessions']['cookieKey'];
        };
      };
      readonly logger?: Logger;
    } & ConstructorParameters<typeof CookiesMongoDBDynamoDBAuthenticationService>[0]
  ) {}

  async getCustomData(connectionId: string) {
    return (await this.getValue(connectionId))?.customData;
  }

  async get(connectionId: string | undefined) {
    this.ctx.logger?.debug('get', {
      connectionId,
    });

    if (!connectionId) {
      return this.createAuthService();
    }

    const value = await this.getValue(connectionId);
    if (!value) {
      return this.createAuthService();
    }

    this.ctx.logger?.debug('get:return', {
      connectionId,
      customData: value.customData,
      availableUserIds: value.service.getAvailableUserIds().map(objectIdToStr),
    });

    return value.service;
  }

  private createAuthService() {
    return new CookiesMongoDBDynamoDBAuthenticationService({
      mongoDB: this.ctx.mongoDB,
      options: this.ctx.options,
      logger: this.ctx.logger,
    });
  }

  private async getValue(connectionId: string) {
    let value = this.cache.get(connectionId);
    if (value) {
      this.ctx.logger?.debug('getValue:existing', {
        connectionId,
      });
      return value;
    }

    const connection = await this.ctx.connections.get({
      id: connectionId,
    });
    if (!connection) {
      this.ctx.logger?.debug('getValue:noConnectionId', {
        connectionId,
      });
      return;
    }

    const customData = parseConnectionCustomData(connection.customData);

    value = {
      service: new CookiesMongoDBDynamoDBAuthenticationService(
        {
          mongoDB: this.ctx.mongoDB,
          options: this.ctx.options,
          sessionsCookie: new SessionsCookie(
            {
              model: customData.sessionsCookie,
            },
            {
              key: this.ctx.options.sessions.cookieKey,
            }
          ),
          logger: this.ctx.logger,
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
