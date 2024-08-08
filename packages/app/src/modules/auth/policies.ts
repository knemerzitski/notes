import { NormalizedCacheObject, TypePolicies } from '@apollo/client';

import { User } from '../../__generated__/graphql';
import { KeySpecifierName } from '../apollo-client/key-specifier';
import { EvictTag, EvictTypePolicies } from '../apollo-client/policy/evict';
import { fieldArrayToMap } from '../apollo-client/utils/field-array-to-map';

import { getCurrentUserIdInStorage } from './user';

export const sessionPolicies: TypePolicies & EvictTypePolicies<NormalizedCacheObject> = {
  Query: {
    fields: {
      user: {
        evict: {
          tag: EvictTag.USER_SPECIFIC,
        },
        keyArgs: () =>
          `user:${JSON.stringify({
            [KeySpecifierName.USER_ID]: getCurrentUserIdInStorage(),
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
