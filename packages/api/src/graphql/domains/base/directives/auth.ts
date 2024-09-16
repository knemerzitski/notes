import { GraphQLSchema } from 'graphql';

import type { DirectiveResolvers } from '../../types.generated';
import { transformSchemaDirectiveResolver } from '../../../utils/transform-schema-directive-resolver';
import { assertAuthenticated } from '../../../../services/auth/assert-authenticated';

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
