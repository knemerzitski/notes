import { TypePolicies } from '@apollo/client';

import { fieldArrayToMap } from '../apollo-client/utils/fieldArrayToMap';
import customKeyArgsFn from '../apollo-client/utils/customKeyArgsFn';
import { getCurrentUserIdInStorage } from './user';
import { KeyArguments } from '../apollo-client/key-args';
import { EvictTag, EvictTypePolicies } from '../apollo-client/policy/evict';

const sessionPolicies: TypePolicies & EvictTypePolicies = {
  Query: {
    fields: {
      user: {
        evictTag: EvictTag.UserSpecific,
        keyArgs: customKeyArgsFn({
          customArgsFnMap: {
            [KeyArguments.UserId]: () => getCurrentUserIdInStorage(),
          },
        }),
      },
      signedInUsers(existing = []) {
        return existing;
      },
      currentSignedInUser(existing = null) {
        return existing;
      },
    },
  },
  User: {
    fields: {
      isSessionExpired(existing = false) {
        return existing;
      },
      email(existing = 'anonymous@unknown') {
        return existing;
      },
      authProviderEntries: fieldArrayToMap('provider', {
        defaultRead: {},
      }),
      profile: {
        merge: true,
      },
    },
  },
  AuthProviderUser: {
    keyFields: false,
  },
};

export default sessionPolicies;
