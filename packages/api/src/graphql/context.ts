import { object } from 'superstruct';
import { Maybe } from '~utils/types';

import { MongoDBCollections } from '../mongodb/collections';
import { MongoDBContext } from '../mongodb/context';
import { createMongoDBLoaders } from '../mongodb/loaders';
import { AuthenticationContext } from '../services/auth/authentication-context';
import { fromHeaders as parseAuthFromHeaders } from '../services/auth/parse-authentication-context';
import { Cookies, CookiesStruct } from '../services/http/cookies';

import {
  ApiGraphQLContext,
  ApiOptions,
  PersistGraphQLContext,
  BaseSubscriptionResolversContext,
  SerializedPersistGraphQLContext,
} from './types';

export interface CreatePersistGraphQLContextParams {
  headers: Readonly<Record<string, string | undefined>> | undefined;
  ctx: Omit<Parameters<typeof parseAuthFromHeaders>[1], 'cookies'>;
}

export async function createPersistGraphQLContext({
  headers,
  ctx,
}: CreatePersistGraphQLContextParams): Promise<PersistGraphQLContext> {
  const cookies = Cookies.parseFromHeaders(headers);

  const auth = await parseAuthFromHeaders(headers, {
    ...ctx,
    cookies,
  });

  return {
    cookies,
    auth,
  };
}

export interface CreateApiGraphQLContextParams {
  mongoDB: MongoDBContext<MongoDBCollections>;
  options: ApiOptions;
}

export function createApiGraphQLContext({
  mongoDB,
  options,
}: CreateApiGraphQLContextParams): Omit<ApiGraphQLContext, 'connectionId'> {
  const mongoDBLoaders = createMongoDBLoaders(mongoDB);

  return {
    mongoDB: {
      ...mongoDB,
      loaders: mongoDBLoaders,
    },
    options,
  };
}

const PersistGraphQLContextStruct = object({
  cookies: CookiesStruct,
  auth: AuthenticationContext,
});

export function serializePersistGraphQLContext(
  context: Maybe<PersistGraphQLContext>
): SerializedPersistGraphQLContext {
  return PersistGraphQLContextStruct.createRaw(context);
}

export function parsePersistGraphQLContext(value: Maybe<unknown>) {
  return PersistGraphQLContextStruct.create(value);
}

export function mergePersistGraphQLContext(
  ctx: Readonly<ApiGraphQLContext>,
  persist: Readonly<PersistGraphQLContext>
): Readonly<ApiGraphQLContext & PersistGraphQLContext>;
export function mergePersistGraphQLContext(
  ctx: Readonly<BaseSubscriptionResolversContext>,
  persist: Readonly<PersistGraphQLContext>
): Readonly<BaseSubscriptionResolversContext & PersistGraphQLContext>;
export function mergePersistGraphQLContext(
  ctx: Readonly<ApiGraphQLContext | BaseSubscriptionResolversContext>,
  persist: Readonly<PersistGraphQLContext>
): Readonly<
  (ApiGraphQLContext | BaseSubscriptionResolversContext) & PersistGraphQLContext
> {
  return {
    ...ctx,
    ...persist,
  };
}
