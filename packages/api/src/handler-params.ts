import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { ServerApiVersion } from 'mongodb';

import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { CreateApolloHttpHandlerParams } from '~lambda-graphql/apollo-http-handler';
import { ApiGatewayContextParams } from '~lambda-graphql/context/apigateway';
import { DynamoDBContextParams } from '~lambda-graphql/context/dynamodb';
import { GraphQLContextParams } from '~lambda-graphql/context/graphql';
import { ConnectionTtlContext } from '~lambda-graphql/dynamodb/models/connection';
import { Logger } from '~utils/logger';

import { defaultTtl, tryRefreshTtl } from './dynamodb/connection-ttl';
import { BaseGraphQLContext, DynamoDBBaseGraphQLContext } from './graphql/context';
import { applyDirectives } from './graphql/directives';
import { resolvers } from './graphql/resolvers.generated';
import { typeDefs } from './graphql/typeDefs.generated';
import { createMongooseContext } from './mongoose/lambda-context';
import { createMongooseModels } from './mongoose/models';


export function createDefaultGraphQLParams<TContext>(
  logger: Logger
): GraphQLContextParams<TContext> {
  const { Subscription, ...allExceptSubscriptionResolvers } = resolvers;

  return {
    logger,
    typeDefs, // TODO separate typeDefs
    resolvers: allExceptSubscriptionResolvers,
    transform: applyDirectives,
  };
}

export function createDefaultSubscriptionGraphQLParams<TContext>(
  logger: Logger
): GraphQLContextParams<TContext> {
  // TODO only pass subscription?
  const { Query, Mutation, ...allExceptQueryMutationResolvers } = resolvers;

  return {
    logger,
    typeDefs, // TODO separate typeDefs
    resolvers: allExceptQueryMutationResolvers,
    transform: applyDirectives,
  };
}

async function fetchMongoDbAtlasRoleCredentials() {
  const stsClient = new STSClient({
    region: process.env.STS_REGION,
  });

  const { Credentials } = await stsClient.send(
    new AssumeRoleCommand({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      RoleArn: process.env.MONGODB_ATLAS_ROLE_ARN!,
      RoleSessionName: 'mongodb-atlas',
    })
  );

  if (!Credentials?.AccessKeyId || !Credentials.SecretAccessKey) {
    throw new Error('AssumeRoleCommand did not return access keys');
  }
  if (!Credentials.SessionToken) {
    throw new Error('AssumeRoleCommand did not return session token');
  }

  return Credentials;
}

export async function createDefaultMongooseContext(logger: Logger) {
  const credentials = await fetchMongoDbAtlasRoleCredentials();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const connectionUri = process.env.MONGODB_ATLAS_URI_SRV!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const databaseName = encodeURIComponent(process.env.MONGODB_ATLAS_DATABASE_NAME!);
  const mongoDbUri = `${connectionUri}/${databaseName}`;

  return await createMongooseContext({
    logger,
    createModels: createMongooseModels,
    uri: mongoDbUri,
    options: {
      auth: {
        username: credentials.AccessKeyId,
        password: credentials.SecretAccessKey,
      },
      authSource: '$external',
      authMechanism: 'MONGODB-AWS',
      authMechanismProperties: {
        AWS_SESSION_TOKEN: credentials.SessionToken,
      },
      retryWrites: true,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    },
  });
}

export function createDefaultDynamoDBParams(logger: Logger): DynamoDBContextParams {
  return {
    logger,
    clientConfig: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      region: process.env.DYNAMODB_REGION!,
    },
    tableNames: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      connections: process.env.DYNAMODB_CONNECTIONS_TABLE_NAME!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      subscriptions: process.env.DYNAMODB_SUBSCRIPTIONS_TABLE_NAME!,
    },
  };
}

export function createDefaultDynamoDBConnectionTtlContext(): ConnectionTtlContext {
  return {
    defaultTtl,
    tryRefreshTtl,
  };
}

export function createDefaultApiGatewayParams(logger: Logger): ApiGatewayContextParams {
  return {
    logger,
    newClient(config) {
      return new ApiGatewayManagementApiClient({
        ...config,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        region: process.env.API_GATEWAY_MANAGEMENT_REGION!,
      });
    },
  };
}

export const createDefaultIsCurrentConnection: CreateApolloHttpHandlerParams<
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext
>['createIsCurrentConnection'] = (_ctx, event) => {
  const wsConnectionId = event.headers[CustomHeaderName.WsConnectionId];
  if (!wsConnectionId) return;
  return (connectionId: string) => wsConnectionId === connectionId;
};
