import { CreateTypePolicyFn } from '../../graphql/types';
import { fieldArrayToMap } from '../../graphql/utils/field-array-to-map';

export const SignedInUser: CreateTypePolicyFn = function () {
  return {
    fields: {
      isSessionExpired(existing = false) {
        return existing;
      },
      email(existing = 'anonymous@unknown', { readField, isReference }): string {
        // Return first available email from authProviderUsers
        const authProviderUsers = readField('authProviderUsers');
        if (Array.isArray(authProviderUsers)) {
          return (
            (readField('authProviderUsers') as unknown[])
              .map((authProviderUser) => {
                if (isReference(authProviderUser)) {
                  return String(readField('email', authProviderUser));
                }
                return;
              })
              .find((email) => email != null) ?? existing
          );
        }
        return existing;
      },
      authProviderUsers: fieldArrayToMap('__typename', {
        defaultRead: {},
      }),
      public: {
        merge: true,
      },
    },
  };
};
