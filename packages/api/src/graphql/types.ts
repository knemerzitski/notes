import { MongoClient } from 'mongodb';

import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { SubscriptionContext } from '~lambda-graphql/pubsub/subscribe';

import { MongoDBCollections } from '../mongodb/collections';

import { MongoDBLoaders } from '../mongodb/loaders';

import {
  AuthenticationContext,
  SerializedAuthenticationContext,
} from '../services/auth/authentication-context';
import { Cookies, SerializedCookies } from '../services/http/cookies';
import { SessionDurationConfig } from '../services/session/duration';

export interface ApiOptions {
  readonly sessions?: {
    /**
     * User sessions stored in MongoDB Sessions collection
     */
    readonly user?: SessionDurationConfig;
    /**
     * Subscriptions stored in DynamoDB tables
     */
    readonly webSocket?: SessionDurationConfig;
  };
  readonly completedSubscriptions: {
    /**
     * How long to store info that a subscription completed before it's been fully processed/subscribed.
     * @default 1000 * 5  // seconds
     */
    readonly duration?: number;
  };
  readonly note?: {
    /**
     * How long note is kept in trash in milliseconds.
     * @default 1000 * 60 * 60 * 24 * 30 // 30 days
     */
    readonly trashDuration?: number;
    /**
     * How long open note document is stored in milliseconds
     * @default 1000 * 60 * 60 // 1 hour
     */
    readonly openNoteDuration?: number;
  };
  readonly collabText?: {
    /**
     * Records array max length. If not defined then array will keep growing.
     * @default 500
     */
    readonly maxRecordsCount?: number;
  };
}

/**
 * Persist GraphQL context is serialized and restored during WebSocket connections
 */
export interface PersistGraphQLContext {
  readonly cookies: Cookies;
  auth: AuthenticationContext;
}

/**
 * Must only contain primitive values so it can be marshalled properly into
 * DynamoDB entry.
 * Class instances are not supported.
 */
export interface SerializedPersistGraphQLContext {
  cookies: SerializedCookies;
  auth: SerializedAuthenticationContext;
}

/**
 * GraphQL context is created before request is handled and is not serializable
 */
export interface ApiGraphQLContext {
  readonly mongoDB: {
    readonly client: MongoClient;
    readonly collections: MongoDBCollections;
    readonly loaders: MongoDBLoaders;
  };
  readonly options?: ApiOptions;
  /**
   * Current user connectionId.
   * Same user might send requests using different connectionId's at the same time.
   */
  readonly connectionId: string | undefined;
}

export type GraphQLResolversContext = ApolloHttpGraphQLContext &
  PersistGraphQLContext &
  ApiGraphQLContext &
  SubscriptionContext;

/**
 * This type is used to define everything that websocket-handler doesn't
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
  keyof PersistGraphQLContext | keyof SubscriptionContext
>;
