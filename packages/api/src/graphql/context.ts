import {
  ApiGraphQLContext,
  ApiOptions,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from './types';
import { MongoDBCollections } from '../mongodb/collections';
import { MongoDBContext } from '../mongodb/context';
import { createMongoDBLoaders } from '../mongodb/loaders';
import {
  serializeAuthenticationContext,
  parseAuthenticationContext,
} from '../services/auth/authentication-context';
import { Cookies } from '../services/http/cookies';
import { parseAuthenticationContextFromHeaders } from '../services/auth/parse-authentication-context-from-headers';
import { FindRefreshSessionByCookieIdParams } from '../services/auth/find-refresh-session-by-cookie-id';

export interface CreateBaseGraphQLContextParams {
  headers: Readonly<Record<string, string | undefined>> | undefined;
  sessionParams: FindRefreshSessionByCookieIdParams;
}

export async function createBaseGraphQLContext({
  headers,
  sessionParams,
}: CreateBaseGraphQLContextParams): Promise<BaseGraphQLContext> {
  const cookies = Cookies.parseFromHeaders(headers);

  const auth = await parseAuthenticationContextFromHeaders({
    headers,
    cookies,
    sessionParams,
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
    sessionParams: {
      loader: ctx.mongoDB.loaders.session,
      sessionDurationConfig: ctx.options?.sessions?.user,
    },
  });

  return serializeBaseGraphQLContext(baseContext);
}
