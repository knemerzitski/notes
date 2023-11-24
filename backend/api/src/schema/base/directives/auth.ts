import { GraphQLError, GraphQLSchema } from 'graphql';

import transformSchemaDirectiveResolver from '../../../graphql/transformSchemaDirectiveResolver';
import { getIdentityFromHeaders } from '../../session/identity';
import type { DirectiveResolvers } from '../../types.generated';

export const auth: NonNullable<DirectiveResolvers['auth']> = async (
  next,
  _parent,
  _args,
  ctx
) => {
  if (!ctx.auth) {
    ctx.auth = await getIdentityFromHeaders(ctx.mongoose, ctx.request.headers);
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
  if (!ctx.auth) {
    throw new GraphQLError('Access denied');
  }

  return next();
};

export function subscriptionAuthTransform(schema: GraphQLSchema): GraphQLSchema {
  return transformSchemaDirectiveResolver(schema, 'auth', subscriptionAuth);
}

export function authTransform(schema: GraphQLSchema): GraphQLSchema {
  return transformSchemaDirectiveResolver(schema, 'auth', auth);
}
