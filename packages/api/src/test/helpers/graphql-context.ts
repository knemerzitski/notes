import { beforeEach, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { WebSocketApi } from '~lambda-graphql/context/apigateway';
import { createGraphQLContext } from '~lambda-graphql/context/graphql';
import { SubscriptionTable } from '~lambda-graphql/dynamodb/models/subscription';
import {
  Publisher,
  createPublisher as _createPublisher,
} from '~lambda-graphql/pubsub/publish';

import { ApiGraphQLContext, GraphQLResolversContext } from '../../graphql/context';
import CookiesContext from '../../graphql/cookies-context';
import NotesDataSource from '../../graphql/note/datasource/notes-datasource';
import { resolvers } from '../../graphql/resolvers.generated';
import { typeDefs } from '../../graphql/typeDefs.generated';
import { UserSchema } from '../../mongodb/schema/user';

import { mongoCollections, mongoClient } from './mongodb';

interface CreateGraphQLResolversContextOptions {
  createPublisher?: (ctx: Omit<GraphQLResolversContext, 'publish'>) => Publisher;
  mongodb?: ApiGraphQLContext['mongodb'];
}

export function createGraphQLResolversContext(
  user?: Partial<UserSchema>,
  options?: CreateGraphQLResolversContextOptions
): GraphQLResolversContext {
  const ctx = {
    auth: user
      ? {
          session: {
            user,
          },
        }
      : null,
    datasources: {
      notes: new NotesDataSource({
        mongodb: {
          collections: options?.mongodb?.collections ?? mongoCollections,
        },
      }),
    },
    mongodb: options?.mongodb ?? {
      client: mongoClient,
      collections: mongoCollections,
    },
    cookies: new CookiesContext({
      sessions: {},
    }),
    response: {
      multiValueHeaders: {},
    },
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

export function createPublisher(ctx: Omit<GraphQLResolversContext, 'publish'>) {
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
