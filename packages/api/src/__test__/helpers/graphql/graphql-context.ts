import { beforeEach, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { WebSocketApi } from '~lambda-graphql/context/apigateway';
import { createGraphQLContext } from '~lambda-graphql/context/graphql';
import { SubscriptionTable } from '~lambda-graphql/dynamodb/models/subscription';
import {
  Publisher,
  createPublisher as _createPublisher,
} from '~lambda-graphql/pubsub/publish';

import { PartialBy } from '~utils/types';

import { ApiGraphQLContext, GraphQLResolversContext } from '../../../graphql/context';
import CookiesContext from '../../../graphql/cookies-context';
import { resolvers } from '../../../graphql/resolvers.generated';
import { typeDefs } from '../../../graphql/typeDefs.generated';

import { MongoDBCollections } from '../../../mongodb/collections';
import { MongoDBContext } from '../../../mongodb/lambda-context';
import { createMongoDBLoaders } from '../../../mongodb/loaders';
import { UserSchema } from '../../../mongodb/schema/user/user';
import { MongoDeepPartial } from '../../../mongodb/types';
import { mongoCollections, mongoClient } from '../mongodb/mongodb';

export interface CreateGraphQLResolversContextOptions {
  user?: Partial<UserSchema>;
  createPublisher?: (ctx: Omit<GraphQLResolversContext, 'publish'>) => Publisher;
  mongodb?: PartialBy<ApiGraphQLContext['mongodb'], 'loaders'>;
  override?: MongoDeepPartial<GraphQLResolversContext>;
}

export function createGraphQLResolversContext(
  options?: CreateGraphQLResolversContextOptions
): GraphQLResolversContext {
  const user = options?.user;

  const mongoDBContext: MongoDBContext<MongoDBCollections> = options?.mongodb ?? {
    client: mongoClient,
    collections: mongoCollections,
  };

  const ctx = {
    auth: user
      ? {
          session: {
            user,
          },
        }
      : null,
    mongodb: {
      loaders: createMongoDBLoaders(mongoDBContext),
      ...mongoDBContext,
    },
    cookies: new CookiesContext({
      sessions: {},
    }),
    response: {
      multiValueHeaders: {},
    },
    ...options?.override,
  } as Omit<GraphQLResolversContext, 'publish'>;

  return {
    ...ctx,
    publish: options?.createPublisher?.(ctx) ?? (vi.fn() as Publisher),
  };
}

export const mockSubscriptionsModel = mockDeep<SubscriptionTable>();
export const mockSocketApi = mockDeep<WebSocketApi>();

beforeEach(() => {
  mockSubscriptionsModel.queryAllByTopic.mockClear();
  mockSocketApi.post.mockClear();
});

export function createMockedPublisher(ctx: Omit<GraphQLResolversContext, 'publish'>) {
  return _createPublisher({
    context: {
      ...ctx,
      schema: createGraphQLContext({
        resolvers,
        typeDefs,
        logger: mockDeep(),
      }).schema,
      graphQLContext: mockDeep(),
      socketApi: mockSocketApi,
      logger: mockDeep(),
      models: {
        connections: mockDeep(),
        subscriptions: mockSubscriptionsModel,
      },
    },
  });
}
