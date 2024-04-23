import { GraphQLResolversContext } from '../../graphql/context';
import { beforeEach, vi } from 'vitest';
import { Publisher, createPublisher } from '~lambda-graphql/pubsub/publish';
import NotesDataSource from '../../graphql/note/datasource/notes-datasource';
import { UserSchema } from '../../mongodb/schema/user';
import { mongoCollections, mongoClient } from './mongodb';
import { createGraphQlContext } from '~lambda-graphql/context/graphql';
import { mockDeep } from 'vitest-mock-extended';
import { WebSocketApi } from '~lambda-graphql/context/apigateway';
import { SubscriptionTable } from '~lambda-graphql/dynamodb/models/subscription';
import { resolvers } from '../../graphql/resolvers.generated';
import { typeDefs } from '../../graphql/typeDefs.generated';

export function createMockedGraphQLContext(
  user?: Partial<UserSchema>,
  publisher = (_ctx: Omit<GraphQLResolversContext, 'publish'>) => vi.fn() as Publisher
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
          collections: mongoCollections,
        },
      }),
    },
    mongodb: {
      collections: mongoCollections,
      client: mongoClient,
    },
  } as Omit<GraphQLResolversContext, 'publish'>;

  return {
    ...ctx,
    publish: publisher(ctx),
  };
}

export const mockSubscriptionsModel = mockDeep<SubscriptionTable>();
export const mockSocketApi = mockDeep<WebSocketApi>();

beforeEach(() => {
  mockSubscriptionsModel.queryAllByTopic.mockClear();
  mockSocketApi.post.mockClear();
});

export function createMockedPublisher(ctx: Omit<GraphQLResolversContext, 'publish'>) {
  return createPublisher({
    context: {
      ...ctx,
      schema: createGraphQlContext({
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
