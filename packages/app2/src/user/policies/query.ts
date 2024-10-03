import { EvictTag } from '../../graphql/policy/evict';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { keyArgsWithUserId } from '../../graphql/utils/key-args-with-user-id';

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
