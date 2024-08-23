import {
  ApiGraphQLContext,
  ApiOptions,
  BaseGraphQLContext,
  DynamoDBBaseGraphQLContext,
} from '../../graphql/types';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBContext } from '../../mongodb/lambda-context';
import { createMongoDBLoaders } from '../../mongodb/loaders';
import {
  serializeAuthenticationContext,
  parseAuthenticationContext,
  FindRefreshSessionByCookieIdParams,
  parseAuthenticationContextFromHeaders,
} from '../auth/auth';
import { Cookies } from '../http/cookies';

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
}: CreateApiGraphQLContextParams): ApiGraphQLContext {
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