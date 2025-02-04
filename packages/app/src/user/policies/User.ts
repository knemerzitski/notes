import { AuthProviderUserType } from '../../__generated__/graphql';
import { CreateTypePolicyFn } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';
import { isLocalId } from '../../utils/is-local-id';

const AUTH_PROVIDER_MAPPING: Record<string, string> = {
  [AuthProviderUserType.GOOGLE]: 'GoogleAuthProviderUser',
};

export const User: CreateTypePolicyFn = function () {
  return {
    fields: {
      local(_existing, { readField, toReference }) {
        const id = readField('id');
        if (id == null) {
          return null;
        }

        return toReference({
          __typename: 'LocalSignedInUser',
          id,
        });
      },
      email(existing = 'unknown@localhost', { readField }) {
        const isLocalOnly = readField('localOnly');
        if (isLocalOnly === true) {
          return 'localOnly';
        }

        // Return first available email from authProviderUsers
        const authProviderUsers = readField('authProviderUsers');
        if (Array.isArray(authProviderUsers)) {
          for (const authProviderUser of authProviderUsers) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const email = readField('email', authProviderUser);
            if (email) {
              return email;
            }
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      authProviderUsers: fieldArrayToMap('__typename', {
        read(existing = {}) {
          return existing;
        },
      }),
      authProviderUser(_existing, { args, readField }) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const type = args?.type;
        if (!type) return null;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const targetTypename = AUTH_PROVIDER_MAPPING[type];

        const authProviderUsers = readField('authProviderUsers');
        if (Array.isArray(authProviderUsers)) {
          for (const authProviderUser of authProviderUsers) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const __typename = readField('__typename', authProviderUser);
            if (__typename === targetTypename) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return authProviderUser;
            }
          }
        }

        return null;
      },
      localOnly(_existing, { readField }) {
        const id = readField('id');
        return isLocalId(id);
      },
    },
  };
};
