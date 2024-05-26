import { TypePolicies } from '@apollo/client';

import { fieldArrayToMap } from '../apollo-client/utils/fieldArrayToMap';

const sessionPolicies: TypePolicies = {
  Query: {
    fields: {
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
};

export default sessionPolicies;
