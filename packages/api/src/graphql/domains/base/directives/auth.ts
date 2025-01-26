import { GraphQLSchema } from 'graphql/index.js';

import { transformSchemaDirectiveResolver } from '../../../utils/transform-schema-directive-resolver';
import type { DirectiveResolvers } from '../../types.generated';

export const auth: NonNullable<DirectiveResolvers['auth']> = async (
  next,
  _parent,
  _args,
  ctx
) => {
  await ctx.services.requestHeaderAuth.getAuth();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return next();
};

export function authTransform(schema: GraphQLSchema): GraphQLSchema {
  return transformSchemaDirectiveResolver(schema, 'auth', auth);
}
