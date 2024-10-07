import { Reference } from '@apollo/client';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { keyArgsWithUserId } from '../../graphql/utils/key-args-with-user-id';
import { EvictTag, TaggedEvictOptionsList } from '../../graphql/utils/tagged-evict';
import { initializeWriteLocalUser } from '../utils/local-user';

export const Query: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      signedInUser: {
        keyArgs: keyArgsWithUserId(ctx),
      },
      signedInUsers: {
        keyArgs: false,
        read(existing = [], { readField, args }) {
          if (args?.by?.localOnly === false) {
            return existing;
          }

          return [readField('localUser'), ...existing];
        },
      },
      currentSignedInUser(existing = null, { readField }) {
        if (existing == null) {
          // Attempt to find first remote user
          const signedInUsers = readField('signedInUsers') as Reference[];
          for (const signedInUser of signedInUsers) {
            const isLocalOnly = readField('localOnly', signedInUser);
            if (!isLocalOnly) {
              return signedInUser;
            }
          }
          return readField('localUser');
        }

        return existing;
      },
      localUser(existing = null, { cache }) {
        if (existing == null) {
          return initializeWriteLocalUser(cache);
        }

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
