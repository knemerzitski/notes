import { MongoClient } from 'mongodb';

import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { SubscriptionContext } from '~lambda-graphql/pubsub/subscribe';

import { MongoDBCollections } from '../mongodb/collections';

import { MongoDBLoaders } from '../mongodb/loaders';

import { Cookies, SerializedCookies } from '../services/http/cookies';
import {
  AuthenticationContext,
  SerializedAuthenticationContext,
} from '../services/auth/authentication-context';
import { SessionDurationConfig } from '../services/session/duration';

export interface ApiOptions {
  sessions?: {
    /**
     * User sessions stored in MongoDB Sessions collection
     */
    user?: SessionDurationConfig;
    /**
     * Subscriptions stored in DynamoDB tables
     */
    webSocket?: SessionDurationConfig;
  };
  note?: {
    /**
     * How long note is kept in trash in milliseconds.
     * @default 1000 * 60 * 60 * 24 * 30 // 30 days
     */
    trashDuration?: number;
    /**
     * How long note editing document is stored in milliseconds
     * @default 1000 * 60 * 60 // 1 hour
     */
    noteEditingDuration?: number;
  };
  collabText?: {
    /**
     * Records array max length. If not defined then array will keep growing.
     * @default 500
     */
    maxRecordsCount?: number;
  };
}

/**
 * Base GraphQL context can be serialized and stored for later use
 */
export interface BaseGraphQLContext {
  cookies: Cookies;
  auth: AuthenticationContext;
}

/**
 * Must only contain primitive values so it can be marshalled properly into
 * DynamoDB entry.
 * Class instances are not supported.
 */
export interface DynamoDBBaseGraphQLContext extends Record<string, unknown> {
  cookies: SerializedCookies;
  auth: SerializedAuthenticationContext;
}

/**
 * GraphQL context is created before request is handled and is not serializable
 */
export interface ApiGraphQLContext {
  mongoDB: {
    client: MongoClient;
    collections: MongoDBCollections;
    loaders: MongoDBLoaders;
  };
  options?: ApiOptions;
  /**
   * Current user connectionId.
   * Same user might send requests using different connectionId's at the same time.
   */
  connectionId: string | undefined;
}

export type GraphQLResolversContext = ApolloHttpGraphQLContext &
  BaseGraphQLContext &
  ApiGraphQLContext &
  SubscriptionContext;

/**
 * This type is used to define everything that websocket-graphql-handlers don't
 * define by default.
 *
 * ApiGraphQLContext
 * mongodb
 *
 * ApolloHttpGraphQLContext
 * request
 * response
 * publish
 *
 */
export type BaseSubscriptionResolversContext = Omit<
  GraphQLResolversContext,
  keyof BaseGraphQLContext | keyof SubscriptionContext
>;
