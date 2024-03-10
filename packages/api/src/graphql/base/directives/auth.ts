import { GraphQLError, GraphQLSchema } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import type { DirectiveResolvers } from '../../../graphql/types.generated';
import transformSchemaDirectiveResolver from '../../../graphql/utils/transformSchemaDirectiveResolver';
import {
  AuthenticatedContext,
  AuthenticationContext,
  parseAuthFromHeaders,
  isAuthenticated,
} from '../../session/auth-context';

export function assertAuthenticated(
  auth: AuthenticationContext | undefined
): asserts auth is AuthenticatedContext {
  if (!isAuthenticated(auth)) {
    throw new GraphQLError('You are not authorized to perform this action.', {
      extensions: {
        code: GraphQLErrorCode.Unauthenticated,
        reason: auth?.reason,
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
    ctx.auth = await parseAuthFromHeaders(
      ctx.request.headers,
      ctx.mongoose.model.Session,
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
