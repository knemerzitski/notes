import { NormalizedCacheObject, TypePolicies } from '@apollo/client';

import { User } from '../../__generated__/graphql';
import { KeySpecifierName } from '../apollo-client/key-specifier';
import { EvictTag, EvictTypePolicies } from '../apollo-client/policy/evict';
import { fieldArrayToMap } from '../apollo-client/utils/fieldArrayToMap';

import { getCurrentUserIdInStorage } from './user';

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
      signedInUsers(existing: User[] = []): User[] {
        return existing;
      },
      currentSignedInUser(existing: User | null = null): User | null | undefined {
        return existing;
      },
    },
  },
  User: {
    fields: {
      // eslint-disable-next-line @typescript-eslint/no-inferrable-types
      isSessionExpired(existing: boolean = false): boolean {
        return existing;
      },
      // eslint-disable-next-line @typescript-eslint/no-inferrable-types
      email(existing: string = 'anonymous@unknown'): string {
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
