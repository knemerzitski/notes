/**
 * Parameters/config for the API.
 * Only this file uses environment variables.
 */
import { BaseContext } from '@apollo/server';
import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { ServerApiVersion } from 'mongodb';

import { ApiGatewayContextParams } from '~lambda-graphql/context/apigateway';
import { DynamoDBContextParams } from '~lambda-graphql/context/dynamodb';
import {
  ApolloGraphQLContextParams,
  GraphQLContextParams,
} from '~lambda-graphql/context/graphql';
import { Logger } from '~utils/logging';

import { ApiOptions } from './graphql/types';
import { applyDirectives } from './graphql/directives';
import { ApolloServerLogger } from './graphql/plugins/apollo-server-logger';
import { resolvers } from './graphql/domains/resolvers.generated';
import { typeDefs } from './graphql/domains/typeDefs.generated';
import { createCollectionInstances } from './mongodb/collections';
import { createMongoDBContext } from './mongodb/context';
import { formatError } from './graphql/errors';

export function createDefaultApiOptions(): ApiOptions {
  return {
    sessions: {
      user: {
        duration: 14 * 24 * 60 * 60, // 14 days,
        refreshThreshold: 0.5, // 7 days
      },
      webSocket: {
        duration: 3 * 60 * 60, // 3 hours
        refreshThreshold: 1 / 3, // 1 hour
      },
    },
    note: {
      trashDuration: 1000 * 60 * 60 * 24 * 30,
    },
    collabText: {
      maxRecordsCount: 500,
    },
  };
}

export function createDefaultGraphQLParams<TContext extends BaseContext>(
  logger: Logger
): ApolloGraphQLContextParams<TContext> {
  const { Subscription, ...allExceptSubscriptionResolvers } = resolvers;

  return {
    logger,
    typeDefs,
    resolvers: allExceptSubscriptionResolvers,
    transform: applyDirectives,
    apolloServerOptions: {
      plugins: [new ApolloServerLogger(logger)],
      formatError,
    },
  };
}

export function createDefaultSubscriptionGraphQLParams<TContext>(
  logger: Logger
): GraphQLContextParams<TContext> {
  const { Query, Mutation, ...allExceptQueryMutationResolvers } = resolvers;

  return {
    logger,
    typeDefs,
    resolvers: allExceptQueryMutationResolvers,
    transform: applyDirectives,
  };
}

async function fetchMongoDBAtlasRoleCredentials() {
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

export async function createDefaultMongoDBContext(logger: Logger) {
  const credentials = await fetchMongoDBAtlasRoleCredentials();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const connectionUri = process.env.MONGODB_ATLAS_URI_SRV!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const databaseName = encodeURIComponent(process.env.MONGODB_ATLAS_DATABASE_NAME!);
  const mongoDBUri = `${connectionUri}/${databaseName}`;

  const timeout = 2000;

  return await createMongoDBContext({
    logger,
    createCollectionInstances,
    uri: mongoDBUri,
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
      connectTimeoutMS: timeout,
      socketTimeoutMS: timeout,
      waitQueueTimeoutMS: timeout,
      serverSelectionTimeoutMS: timeout,
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
