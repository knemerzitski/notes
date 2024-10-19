import { Reference } from '@apollo/client';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { keyArgsWithUserId } from '../../graphql/utils/key-args-with-user-id';
import { EvictTag, TaggedEvictOptionsList } from '../../graphql/utils/tagged-evict';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';

export const Query: CreateTypePolicyFn = function (ctx: TypePoliciesContext) {
  return {
    fields: {
      signedInUser: {
        keyArgs: keyArgsWithUserId(ctx),
      },
      signedInUserById: {
        keyArgs: false,
        read(_existing, { args, toReference }) {
          const id = args?.id;
          if (!id) {
            return null;
          }

          return toReference({
            __typename: 'SignedInUser',
            id: args.id,
          });
        },
      },
      signedInUsers: fieldArrayToMap('id', {
        read(existing, { readField, args }) {
          if (args?.localOnly === false) {
            return existing;
          }

          existing = existing ?? {};

          // Add localUser to result
          const localUser = readField('localUser') as Reference;
          const localUserId = readField('id', localUser);
          if (typeof localUserId === 'string') {
            return { [localUserId]: localUser, ...existing };
          }

          return existing;
        },
        mergeFilterIncoming(incoming, { readField, toReference }) {
          // Filter out localUser
          const localUser = readField(
            'localUser',
            toReference({
              __typename: 'Query',
            })
          ) as Reference;
          const localUserId = readField('id', localUser);
          if (typeof localUserId === 'string') {
            return incoming.filter((userRef) => {
              const userId = readField('id', userRef);
              return userId !== localUserId;
            });
          }

          return;
        },
      }),
      currentSignedInUser(existing = null, { readField }) {
        const signedInUsers = readField('signedInUsers') as Reference[];

        // Ensure current exists in signedInUsers
        if (existing != null) {
          const currentUserId = readField('id', existing);
          if (currentUserId == null) {
            existing = null;
          }
          existing = signedInUsers.some((user) => currentUserId === readField('id', user))
            ? existing
            : null;
        }

        if (existing == null) {
          // Attempt to find first remote user
          for (const user of signedInUsers) {
            const isLocalOnly = readField('localOnly', user);
            if (!isLocalOnly) {
              return user;
            }
          }
          return readField('localUser');
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
        fieldName: 'currentSignedInUser',
      },
      {
        id: 'ROOT_QUERY',
        fieldName: 'signedInUser',
      },
      {
        id: 'ROOT_QUERY',
        fieldName: 'signedInUserById',
      },
    ],
  },
];
