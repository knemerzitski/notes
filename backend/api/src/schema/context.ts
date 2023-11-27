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
