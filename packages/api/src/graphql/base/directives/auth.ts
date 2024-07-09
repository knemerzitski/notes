import { GraphQLError, GraphQLSchema } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import type { DirectiveResolvers } from '../../../graphql/types.generated';
import transformSchemaDirectiveResolver from '../../../graphql/utils/transformSchemaDirectiveResolver';
import {
  AuthenticatedContext,
  AuthenticationContext,
  isAuthenticated,
} from '../../auth-context';

export function assertAuthenticated(
  auth: AuthenticationContext | undefined
): asserts auth is AuthenticatedContext {
  if (!isAuthenticated(auth)) {
    throw new GraphQLError('You are not authorized to perform this action.', {
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
