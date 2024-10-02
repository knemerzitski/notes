import { EvictTag } from '../../apollo-client/policy/evict';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../apollo-client/types';
import { keyArgsWithUserId } from '../../apollo-client/utils/key-args-with-user-id';

export const Query: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      signedInUser: {
        evict: {
          tag: EvictTag.CURRENT_USER,
        },
        keyArgs: keyArgsWithUserId(ctx),
      },
      signedInUsers(existing = []) {
        return existing;
      },
      currentSignedInUser(existing = null) {
        return existing;
      },
    },
  };
};
