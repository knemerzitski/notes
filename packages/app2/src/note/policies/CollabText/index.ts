/* eslint-disable unicorn/filename-case */
import { CreateTypePolicyFn, TypePoliciesContext } from '../../../graphql/types';
import { textAtRevision } from './textAtRevision';

export const CollabText: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      recordConnection: {
        keyArgs: false,
      },
      textAtRevision: textAtRevision(ctx),
    },
  };
};
