// TODO @auth directive is not used but remains here as documentation
import { GraphQLSchema } from 'graphql/index.js';

import { transformSchemaDirectiveResolver } from '../../../utils/transform-schema-directive-resolver';
import type { DirectiveResolvers } from '../../types.generated';


/*
"""
Requires user to be authenticated and with access to specific role
"""
directive @auth(requires: Role = USER) on OBJECT | FIELD_DEFINITION

"""
TODO desc
"""
enum Role {
  USER
}
*/

export const auth: NonNullable<DirectiveResolvers['auth']> = async (
  next,
  _parent,
  _args,
  _ctx
) => {
  // TODO uncomment to enable auth
  // await ctx.services.requestHeaderAuth.getAuth();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return next();
};

export function authTransform(schema: GraphQLSchema): GraphQLSchema {
  return transformSchemaDirectiveResolver(schema, 'auth', auth);
}
