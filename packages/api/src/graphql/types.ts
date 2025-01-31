import { MongoClient } from 'mongodb';

import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { SubscriptionGraphQLContext } from '~lambda-graphql/pubsub/subscribe';

import { BaseGraphQLContext } from '~lambda-graphql/type';
import { WebSocketGraphQLContext } from '~lambda-graphql/websocket-handler';

import { MongoDBCollections } from '../mongodb/collections';

import { MongoDBLoaders } from '../mongodb/loaders';

import { AuthenticationService } from '../services/auth/types';
import { SessionDurationConfig } from '../services/session/duration';

export interface ApiOptions {
  readonly sessions?: {
    /**
     * @default "Sessions"
     */
    readonly cookieKey?: string;
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
 * GraphQL context is created before request is handled and is not serializable
 */
export interface GraphQLContext {
  readonly services: {
    readonly auth: AuthenticationService;
  };
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

export type GraphQLResolversContext = GraphQLContext &
  BaseGraphQLContext &
  SubscriptionGraphQLContext &
  ApolloHttpGraphQLContext &
  WebSocketGraphQLContext;

/**
 * Type for apollo-http-handler
 */
export type ApolloHttpHandlerGraphQLResolversContext = GraphQLContext &
  Omit<WebSocketGraphQLContext, keyof ApolloHttpGraphQLContext>;

/**
 * Type for websocket-handler
 */
export type WebSocketHandlerGraphQLResolversContext = GraphQLContext &
  Omit<ApolloHttpGraphQLContext, keyof WebSocketGraphQLContext>;
