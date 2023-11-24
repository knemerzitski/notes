import { Connection } from 'mongoose';

import { GraphQLContext as ApolloHttpGraphQLContext } from '~lambda-graphql/apollo-http-handler';
import { SubscriptionContext } from '~lambda-graphql/pubsub/subscribe';

import { Identity } from './session/identity';

export interface BaseGraphQLContext {
  auth?: Identity;
}

export interface MongooseGraphQLContext {
  mongoose: Connection;
}

export type GraphQLResolversContext = ApolloHttpGraphQLContext &
  BaseGraphQLContext &
  MongooseGraphQLContext &
  SubscriptionContext;
