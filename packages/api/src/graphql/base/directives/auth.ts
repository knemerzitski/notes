import { GraphQLError, GraphQLSchema } from 'graphql';

import type { DirectiveResolvers } from '../../../graphql/types.generated';
import transformSchemaDirectiveResolver from '../../../graphql/utils/transformSchemaDirectiveResolver';
import {
  CookieSessionUser,
  getSessionUserFromHeaders,
} from '../../session/parse-cookies';

export function assertAuthenticated(
  auth: CookieSessionUser | undefined
): asserts auth is CookieSessionUser {
  if (!auth) {
    throw new GraphQLError('You are not authorized to perform this action.', {
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    });
  }
}

export const auth: NonNullable<DirectiveResolvers['auth']> = async (
  next,
  _parent,
  _args,
  ctx
) => {
  if (!ctx.auth) {
    ctx.auth = await getSessionUserFromHeaders(
      ctx.mongoose,
      ctx.request.headers,
      ctx.session.tryRefreshExpireAt
    );

    assertAuthenticated(ctx.auth);
  }

  return next();
};

/**
 * Authentication in subscription happens during initial websocket CONNECT
 * message when HTTP headers are available and cookies can be read for session ID
 * So if 'ctx' doesn't have 'auth' defined then session ID wasn't found in cookies.
 */
export const subscriptionAuth: NonNullable<DirectiveResolvers['auth']> = async (
  next,
  _parent,
  _args,
  ctx
) => {
  assertAuthenticated(ctx.auth);

  return next();
};

export function subscriptionAuthTransform(schema: GraphQLSchema): GraphQLSchema {
  return transformSchemaDirectiveResolver(schema, 'auth', subscriptionAuth);
}

export function authTransform(schema: GraphQLSchema): GraphQLSchema {
  return transformSchemaDirectiveResolver(schema, 'auth', auth);
}
