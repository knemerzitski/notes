import { NormalizedCacheObject, TypePolicies } from '@apollo/client';

import { fieldArrayToMap } from '../apollo-client/utils/fieldArrayToMap';
import { getCurrentUserIdInStorage } from './user';
import { KeySpecifierName } from '../apollo-client/key-specifier';
import { EvictTag, EvictTypePolicies } from '../apollo-client/policy/evict';

const sessionPolicies: TypePolicies & EvictTypePolicies<NormalizedCacheObject> = {
  Query: {
    fields: {
      user: {
        evict: {
          tag: EvictTag.UserSpecific,
        },
        keyArgs: () =>
          `user:${JSON.stringify({
            [KeySpecifierName.UserId]: getCurrentUserIdInStorage(),
          })}`,
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
