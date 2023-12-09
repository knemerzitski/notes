import { Connection } from 'mongoose';

import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { SubscriptionContext } from '~lambda-graphql/pubsub/subscribe';

import { MongooseModels } from './mongoose-schemas';
import { Identity } from './session/identity';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BaseGraphQLContext = {
  auth?: Identity;
};

export interface MongooseGraphQLContext {
  mongoose: {
    connection: Connection;
    model: MongooseModels;
  };
  session: {
    /**
     * @returns Fresh Date object with time set to maximum session duration
     */
    newExpireAt: () => Date;
    /**
     * Attempts to refresh if it's below threshold
     * @param expireAt Date session instance to refresh
     * @returns  was {@link expireAt} changed
     */
    tryRefreshExpireAt: (expireAt: Date) => boolean;
  };
}

export type GraphQLResolversContext = ApolloHttpGraphQLContext &
  BaseGraphQLContext &
  MongooseGraphQLContext &
  SubscriptionContext;

/**
 * This type is used to define everything that websocket-graphql-handlers don't
 * define by default.
 *
 * MongooseGraphQLContext
 * mongoose
 * session
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

export function createErrorBaseSubscriptionResolversContext(
  name = 'websocket-handler'
): BaseSubscriptionResolversContext {
  function createErrorProxy(propertyName: string) {
    return new Proxy(
      {},
      {
        get() {
          `${propertyName} is not available in ${name}`;
        },
      }
    );
  }

  return {
    get mongoose() {
      return createErrorProxy('mongoose') as MongooseGraphQLContext['mongoose'];
    },
    get request() {
      return createErrorProxy('request') as ApolloHttpGraphQLContext['request'];
    },
    get session() {
      return createErrorProxy('session') as MongooseGraphQLContext['session'];
    },
    get response() {
      return createErrorProxy('response') as ApolloHttpGraphQLContext['response'];
    },
    publish() {
      throw new Error(`Publish should never be called in ${name}`);
    },
  };
}
