import { MongoDBCollections } from '../mongodb/collections';
import { MongoDBContext } from '../mongodb/context';
import { createMongoDBLoaders } from '../mongodb/loaders';
import {
  serializeAuthenticationContext,
  parseAuthenticationContext,
} from '../services/auth/authentication-context';
import { fromHeaders as parseAuthFromHeaders } from '../services/auth/parse-authentication-context';
import { Cookies } from '../services/http/cookies';

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

export function serializeBaseGraphQLContext(
  context: BaseGraphQLContext
): DynamoDBBaseGraphQLContext {
  return {
    ...context,
    cookies: context.cookies.serialize(),
    auth: serializeAuthenticationContext(context.auth),
  };
}

export function parseDynamoDBBaseGraphQLContext(
  value: DynamoDBBaseGraphQLContext | undefined
) {
  return {
    auth: parseAuthenticationContext(value?.auth),
    cookies: new Cookies({
      sessions: value?.cookies.sessions ?? {},
    }),
  };
}

export async function headersToSerializedBaseGraphQLContext(
  headers: Readonly<Record<string, string | undefined>> | undefined,
  ctx: ApiGraphQLContext
): Promise<DynamoDBBaseGraphQLContext> {
  const baseContext = await createBaseGraphQLContext({
    headers,
    ctx,
  });

  return serializeBaseGraphQLContext(baseContext);
}
