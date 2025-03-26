import { MongoClient } from 'mongodb';

import { ApolloHttpGraphQLContext } from '../../../lambda-graphql/src/apollo-http-handler';
import { SubscriptionGraphQLContext } from '../../../lambda-graphql/src/pubsub/subscribe';
import { BaseGraphQLContext } from '../../../lambda-graphql/src/type';
import { WebSocketGraphQLContext } from '../../../lambda-graphql/src/websocket-handler';

import { ReadonlyDeep } from '../../../utils/src/types';

import { MongoDBCollections } from '../mongodb/collections';

import { MongoDBLoaders } from '../mongodb/loaders';

import { AuthenticationService } from '../services/auth/types';
import { SessionDurationConfig } from '../services/session/duration';

export interface ApiOptions {
  sessions: {
    /**
     * Key used in user's browser cookie to store sessions.
     * @default "Sessions"
     */
    cookieKey: string;
    /**
     * User sessions stored in MongoDB Sessions collection
     */
    user: SessionDurationConfig;
    /**
     * Subscriptions stored in DynamoDB tables
     */
    webSocket: SessionDurationConfig;
  };
  completedSubscriptions: {
    /**
     * How long to store info that a subscription has
     * completed before it's been fully processed/subscribed.
     * Value is in milliseconds. \
     * @default 1000 * 5  // seconds
     */
    duration: number;
  };
  note: {
    /**
     * How long note is kept in trash. After duration has elapsed,
     * not is eligible for deletion.
     * Value is in milliseconds. \
     * @default 1000 * 60 * 60 * 24 * 30 // 30 days
     */
    trashDuration: number;
    /**
     * How long opened note state is persisted in database
     * withouth receiving any updates from clients.
     * Value is in milliseconds. \
     * @default 1000 * 60 * 60 // 1 hour
     */
    openNoteDuration: number;
    /**
     * How many users can a single note have. Limits sharing of a note.
     * Set null for unlimited.
     * @default 10
     */
    maxUsersCount: number | null;
  };
  collabText: {
    /**
     * Maxiumum amount of collaborative text records per note.
     * Set null for unlimited amount of records.
     * @default 500
     */
    maxRecordsCount: number | null;
  };
}

/**
 * GraphQL context is created before request is handled and is not serializable
 */
interface GraphQLContext {
  services: Readonly<{
    auth: AuthenticationService;
  }>;
  mongoDB: Readonly<{
    client: MongoClient;
    collections: MongoDBCollections;
    loaders: MongoDBLoaders;
  }>;
  options: ReadonlyDeep<ApiOptions>;
  /**
   * Current user connectionId that is tied to WebSocket subscriptions.
   * Same user might send requests using different connectionId's at the same time.
   */
  connectionId: string | undefined;
}

type ReadonlyGraphQLContext = Readonly<GraphQLContext>;

export type GraphQLResolversContext = ReadonlyGraphQLContext &
  BaseGraphQLContext &
  SubscriptionGraphQLContext &
  ApolloHttpGraphQLContext &
  WebSocketGraphQLContext;

/**
 * Type for apollo-http-handler
 */
export type ApolloHttpHandlerGraphQLResolversContext = ReadonlyGraphQLContext &
  Omit<WebSocketGraphQLContext, keyof ApolloHttpGraphQLContext>;

/**
 * Type for websocket-handler
 */
export type WebSocketHandlerGraphQLResolversContext = ReadonlyGraphQLContext &
  Omit<ApolloHttpGraphQLContext, keyof WebSocketGraphQLContext>;
