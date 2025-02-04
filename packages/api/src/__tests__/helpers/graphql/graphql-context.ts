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
import { GraphQLContext, GraphQLResolversContext } from '../../../graphql/types';

import { AuthenticatedContextsModel } from '../../../models/auth/authenticated-contexts';
import { MongoDBCollections } from '../../../mongodb/collections';
import { MongoDBContext } from '../../../mongodb/context';
import { createMongoDBLoaders } from '../../../mongodb/loaders';
import { QueryableSession } from '../../../mongodb/loaders/session/description';
import { DBSessionSchema } from '../../../mongodb/schema/session';
import { DBUserSchema } from '../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../mongodb/types';
import { objectIdToStr } from '../../../mongodb/utils/objectid';
import { CookiesMongoDBDynamoDBAuthenticationService } from '../../../services/auth/auth-service';
import { Cookies } from '../../../services/http/cookies';
import { SessionsCookie } from '../../../services/http/sessions-cookie';
import { mongoCollections, mongoClient } from '../mongodb/mongodb';

export interface CreateGraphQLResolversContextOptions {
  user?: Partial<DBUserSchema>;
  session?: Partial<DBSessionSchema>;
  createPublisher?: (ctx: Omit<GraphQLResolversContext, 'publish'>) => Publisher;
  mongoDB?: PartialBy<GraphQLContext['mongoDB'], 'loaders'>;
  override?: MongoPartialDeep<GraphQLResolversContext>;
  cookies?: Cookies;
  sessionsCookie?: SessionsCookie;
  contextValue?: GraphQLResolversContext;
}

export function createGraphQLResolversContext(
  options?: CreateGraphQLResolversContextOptions
): GraphQLResolversContext {
  if (options?.contextValue) {
    return options.contextValue;
  }

  const mongoDBContext: MongoDBContext<MongoDBCollections> = options?.mongoDB ?? {
    client: mongoClient,
    collections: mongoCollections,
  };

  const mongoDB = {
    loaders: createMongoDBLoaders(mongoDBContext),
    ...mongoDBContext,
  };

  const cookies =
    options?.cookies ??
    new Cookies(
      options?.user?._id
        ? { [objectIdToStr(options.user._id)]: options.session?.cookieId ?? 'unknown' }
        : {}
    );
  const sessionsCookie =
    options?.sessionsCookie ??
    new SessionsCookie({
      cookies,
    });

  const authModel = new AuthenticatedContextsModel();
  const authService = new CookiesMongoDBDynamoDBAuthenticationService(
    {
      mongoDB,
      sessionsCookie,
    },
    authModel
  );

  if (options?.user?._id) {
    authModel.set(objectIdToStr(options.user._id), {
      session: {
        userId: options.user._id,
        ...options.session,
      } as QueryableSession,
    });
  }

  const ctx = {
    mongoDB,
    response: {
      multiValueHeaders: {},
    },
    services: {
      auth: authService,
      ...options?.override?.services,
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
      loaders: {
        subscriptions: mockSubscriptionsModel,
      },
    },
    getGraphQLContext: () => Promise.resolve(mockDeep()),
  });
}
