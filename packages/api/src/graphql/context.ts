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
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from './types';

export interface CreateBaseGraphQLContextParams {
  headers: Readonly<Record<string, string | undefined>> | undefined;
  ctx: Omit<Parameters<typeof parseAuthFromHeaders>[1], 'cookies'>;
}

export async function createBaseGraphQLContext({
  headers,
  ctx,
}: CreateBaseGraphQLContextParams): Promise<BaseGraphQLContext> {
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

const BaseGraphQLContextStruct = object({
  cookies: CookiesStruct,
  auth: AuthenticationContext,
});

export function serializeBaseGraphQLContext(
  context: Maybe<BaseGraphQLContext>
): DynamoDBBaseGraphQLContext {
  return BaseGraphQLContextStruct.createRaw(context);
}

export function parseDynamoDBBaseGraphQLContext(value: Maybe<unknown>) {
  return BaseGraphQLContextStruct.create(value);
}
