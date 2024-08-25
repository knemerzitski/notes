import { GraphQLError, GraphQLSchema } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import type { DirectiveResolvers } from '../../../graphql/types.generated';
import { transformSchemaDirectiveResolver } from '../../../services/graphql/transform-schema-directive-resolver';
import {
  AuthenticationContext,
  AuthenticatedContext,
  isAuthenticated,
} from '../../../services/auth/auth';

export function assertAuthenticated(
  auth: AuthenticationContext | undefined
): asserts auth is AuthenticatedContext {
  if (!isAuthenticated(auth)) {
    throw new GraphQLError('You must be signed in to perform this action.', {
      extensions: {
        code: GraphQLErrorCode.UNAUTHENTICATED,
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
  assertAuthenticated(ctx.auth);

  return next();
};

export function authTransform(schema: GraphQLSchema): GraphQLSchema {
  return transformSchemaDirectiveResolver(schema, 'auth', auth);
}
