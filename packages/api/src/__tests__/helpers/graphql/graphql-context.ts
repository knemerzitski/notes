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

import { resolvers } from '../../../graphql/domains/resolvers.generated';
import { typeDefs } from '../../../graphql/domains/typeDefs.generated';
import { ApiGraphQLContext, GraphQLResolversContext } from '../../../graphql/types';

import { MongoDBCollections } from '../../../mongodb/collections';
import { MongoDBContext } from '../../../mongodb/context';
import { createMongoDBLoaders } from '../../../mongodb/loaders';
import { DBUserSchema } from '../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../mongodb/types';
import { objectIdToStr } from '../../../mongodb/utils/objectid';
import { Cookies } from '../../../services/http/cookies';
import { mongoCollections, mongoClient } from '../mongodb/mongodb';

export interface CreateGraphQLResolversContextOptions {
  user?: Partial<DBUserSchema>;
  createPublisher?: (ctx: Omit<GraphQLResolversContext, 'publish'>) => Publisher;
  mongoDB?: PartialBy<ApiGraphQLContext['mongoDB'], 'loaders'>;
  override?: MongoPartialDeep<GraphQLResolversContext>;
}

export function createGraphQLResolversContext(
  options?: CreateGraphQLResolversContextOptions
): GraphQLResolversContext {
  const user = options?.user;

  const mongoDBContext: MongoDBContext<MongoDBCollections> = options?.mongoDB ?? {
    client: mongoClient,
    collections: mongoCollections,
  };

  const ctx = {
    auth: user
      ? {
          session: {
            userId: user._id,
          },
        }
      : null,
    mongoDB: {
      loaders: createMongoDBLoaders(mongoDBContext),
      ...mongoDBContext,
    },
    cookies: new Cookies({
      sessions: user?._id ? { [objectIdToStr(user._id)]: 'unknown' } : {},
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
      socketApi: mockSocketApi,
      logger: mockDeep(),
      formatError: (err) => err,
      models: {
        subscriptions: mockSubscriptionsModel,
      },
    },
    getGraphQLContext: () => mockDeep(),
  });
}
