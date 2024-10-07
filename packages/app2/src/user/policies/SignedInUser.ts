import { AuthProviderUserType } from '../../__generated__/graphql';
import { CreateTypePolicyFn } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';

const AUTH_PROVIDER_MAPPING: Record<string, string> = {
  [AuthProviderUserType.GOOGLE]: 'GoogleAuthProviderUser',
};

export const SignedInUser: CreateTypePolicyFn = function () {
  return {
    fields: {
      sessionExpired(existing = false) {
        return existing;
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
            const email = readField('email', authProviderUser);
            if (email) {
              return email;
            }
          }
        }
        return existing;
      },
      authProviderUsers: fieldArrayToMap('__typename', {
        defaultRead: {},
      }),
      authProviderUser(_existing, { args, readField }) {
        const type = args?.type;
        if (!type) return null;

        const targetTypename = AUTH_PROVIDER_MAPPING[type];

        const authProviderUsers = readField('authProviderUsers');
        if (Array.isArray(authProviderUsers)) {
          for (const authProviderUser of authProviderUsers) {
            const __typename = readField('__typename', authProviderUser);
            if (__typename === targetTypename) {
              return authProviderUser;
            }
          }
        }

        return null;
      },
      localOnly(existing = false) {
        return existing;
      },
      public: {
        merge: true,
      },
    },
  };
};
