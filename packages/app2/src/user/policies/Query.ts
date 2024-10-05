import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { keyArgsWithUserId } from '../../graphql/utils/key-args-with-user-id';
import { EvictTag, TaggedEvictOptionsList } from '../../graphql/utils/tagged-evict';

export const Query: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      signedInUser: {
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

export const evictOptions: TaggedEvictOptionsList = [
  {
    tag: EvictTag.CURRENT_USER,
    options: [
      {
        id: 'ROOT_QUERY',
        fieldName: 'signedInUser',
      },
    ],
  },
];
