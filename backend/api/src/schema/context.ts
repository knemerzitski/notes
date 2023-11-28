import { Connection } from 'mongoose';

import { ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { SubscriptionContext } from '~lambda-graphql/pubsub/subscribe';

import { Identity } from './session/identity';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BaseGraphQLContext = {
  auth?: Identity;
};

export interface MongooseGraphQLContext {
  mongoose: Connection;
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
  return {
    get mongoose() {
      return new Proxy(
        {},
        {
          get() {
            throw new Error(`Mongoose is not available in ${name}`);
          },
        }
      ) as Connection;
    },
    get request() {
      return new Proxy(
        {},
        {
          get() {
            throw new Error(`Request is not available in ${name}`);
          },
        }
      ) as {
        headers: Record<string, string>;
        multiValueHeaders: Record<string, string[]>;
      };
    },
    get response() {
      return new Proxy(
        {},
        {
          get() {
            throw new Error(`Response is not available in ${name}`);
          },
        }
      ) as {
        headers: Record<string, string>;
        multiValueHeaders: Record<string, string[]>;
      };
    },
    publish() {
      throw new Error(`Publish should never be called in ${name}`);
    },
  };
}
