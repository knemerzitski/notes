import { Reference } from '@apollo/client';

import { isObjectLike } from '~utils/type-guards/is-object-like';

import { User } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';
import { EvictTag, TaggedEvictOptionsList } from '../../graphql/utils/tagged-evict';

function throwUserNotFoundError(userId?: User['id']): never {
  if (userId) {
    throw new Error(`User "${userId}" not found`);
  } else {
    throw new Error('Query is missing user id');
  }
}

export const Query: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      signedInUser: {
        keyArgs: false,
        read(_existing, { args, toReference }) {
          if (!args || !isObjectLike(args)) {
            throwUserNotFoundError();
          }

          const by = args.by;
          if (!isObjectLike(by)) {
            throwUserNotFoundError();
          }

          if (typeof by.id !== 'string') {
            throwUserNotFoundError(String(by.id));
          }

          return toReference({
            __typename: 'User',
            id: by.id,
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
          const localUser = readField('localUser') as Reference | undefined;
          if (localUser) {
            const localUserId = readField('id', localUser);
            if (typeof localUserId === 'string') {
              return { [localUserId]: localUser, ...existing };
            }
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const currentUserId = readField('id', existing);
          if (currentUserId == null) {
            existing = null;
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return readField('localUser');
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      publicUser: {
        keyArgs: false,
        read(_existing, { args, toReference }) {
          if (!args || !isObjectLike(args)) {
            return null;
          }

          const by = args.by;
          if (!isObjectLike(by)) {
            return null;
          }

          if (typeof by.id === 'string') {
            return toReference({
              __typename: 'PublicUser',
              id: by.id,
            });
          }

          return null;
        },
        merge: false,
      },
    },
  };
};

const userSpecificFields: string[] = ['currentSignedInUser', 'signedInUser'];

export const evictOptions: TaggedEvictOptionsList = [
  {
    tag: EvictTag.USER_SPECIFIC,
    options: [
      ...userSpecificFields.map((fieldName) => ({
        fieldName,
      })),
    ],
  },
];
