import { beforeEach, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { WebSocketApi } from '../../../../../lambda-graphql/src/context/apigateway';
import { createGraphQLContext } from '../../../../../lambda-graphql/src/context/graphql';
import { SubscriptionTable } from '../../../../../lambda-graphql/src/dynamodb/models/subscription';
import {
  Publisher,
  createPublisher as _createPublisher,
} from '../../../../../lambda-graphql/src/pubsub/publish';
import { mergeObjects } from '../../../../../utils/src/object/merge-objects';
import { PartialBy } from '../../../../../utils/src/types';

import { resolvers } from '../../../graphql/domains/resolvers.generated';
import { typeDefs } from '../../../graphql/domains/typeDefs.generated';
import { ApiOptions, GraphQLResolversContext } from '../../../graphql/types';

import { AuthenticatedContextsModel } from '../../../models/auth/authenticated-contexts';
import { MongoDBCollections } from '../../../mongodb/collections';
import { MongoDBContext } from '../../../mongodb/context';
import { createMongoDBLoaders } from '../../../mongodb/loaders';
import { QueryableSession } from '../../../mongodb/loaders/session/description';
import { DBSessionSchema } from '../../../mongodb/schema/session';
import { DBUserSchema } from '../../../mongodb/schema/user';
import { MongoPartialDeep } from '../../../mongodb/types';
import { objectIdToStr } from '../../../mongodb/utils/objectid';
import { createDefaultApiOptions } from '../../../parameters';
import { CookiesMongoDBDynamoDBAuthenticationService } from '../../../services/auth/auth-service';
import { Cookies } from '../../../services/http/cookies';
import { SessionsCookie } from '../../../services/http/sessions-cookie';
import { mongoCollections, mongoClient } from '../mongodb/instance';

export interface CreateGraphQLResolversContextOptions {
  user?: Partial<DBUserSchema>;
  session?: Partial<DBSessionSchema>;
  createPublisher?: (ctx: Omit<GraphQLResolversContext, 'publish'>) => Publisher;
  mongoDB?: PartialBy<GraphQLResolversContext['mongoDB'], 'loaders'>;
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

  const apiOptions = mergeObjects(
    createDefaultApiOptions(),
    options?.override?.options
  ) as ApiOptions;

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
      options: apiOptions,
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
    options: apiOptions,
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
